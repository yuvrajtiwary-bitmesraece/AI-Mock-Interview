# Verdict design notes

[SPEC.md](SPEC.md) is the source of truth. This file records the decisions the spec leaves open and every place where the code deliberately differs from it, with the reason.

## Where Verdict lives

Verdict is the `verdict/` directory of the AI Mock Interview repository, a Go module of its own, rather than a separate repository. The spec asks for a public, MIT-licensed repository, and this one is. Keeping the judge next to the app that uses it means one place to look, one changelog and one issue tracker. The [Verdict workflow](../../.github/workflows/verdict.yml) only runs when `verdict/` changes, and `.vercelignore` keeps the directory out of the app's Vercel deployments.

## Test inputs are streamed, not mounted

*Differs from spec section 5, items 6 and 9.*

The spec mounts the problem's test inputs into the container read-only and starts each program "with stdin from the input file". That would leak hidden tests in two ways:

- **At compile time.** A C++ program can `#include` any file it can read, and when the file is not valid C++, the compiler quotes it in its error messages. Those come back in `compile_output`. With the inputs mounted, `#include "/tests/7.in"` prints a hidden test.
- **Through the samples.** In submit mode the sample tests run in the same container as the hidden tests, and a sample's actual output is returned. A program could read every hidden input from the mount and print them as its answer to a sample.

So nothing from the host is mounted. The worker writes the job to the runner's stdin as one line of JSON, then the input of every test, back to back. The runner streams each input into the program's stdin when that test starts. A program can only ever read the input of the test it is running, the compiler never sees any test, and expected outputs still never enter the container.

The consequences:

- The program's stdin is a pipe, not a file, so a program that seeks or memory-maps stdin fails. That is fine for problems that read stdin and write stdout.
- Inputs are never buffered whole: the runner's memory use stays the same however large the tests are.
- The sandbox needs no host paths, so it works the same with Docker Desktop on Windows and macOS, and when the worker itself runs in a container.

## The runner

- **The re-exec shim.** Go cannot run code between `fork` and `exec`, so the runner starts its own binary again with a special first argument. That shim sets `RLIMIT_CPU`, `RLIMIT_FSIZE`, `RLIMIT_STACK` (the memory limit) and `RLIMIT_CORE` (0), raises its own `oom_score_adj`, and then `exec`s the program. The limits are in place before the program's first instruction, and they survive `exec`. A status pipe tells the runner whether the limits were set and whether the `exec` worked. If the limits cannot be set, the program never runs and the submission gets IE.
- **`RLIMIT_CPU` is a backstop.** It is the CPU limit rounded up to whole seconds, plus one. The exact CPU time comes from `rusage`, and anything over the limit is TLE.
- **Only stdin, stdout and stderr reach the program.** The shim marks every descriptor from 3 up close-on-exec with `close_range`, or by walking `/proc/self/fd` on older kernels. That holds even if the runner itself inherited stray descriptors.
- **Nothing outlives its test.** Each program runs in its own process group, and the group is killed at the wall-clock limit. As PID 1, the runner also kills every other process in the container with `kill(-1, SIGKILL)` after each step and reaps them. That catches processes that left the group with `setsid`, or that would hold the output pipes open and slow down the next test.
- **The runner catches every signal.** PID 1 only receives signals it has a handler for, and the Go runtime installs one for every signal. Without this, a `kill(1, SIGTERM)` from the candidate's program would stop the runner. That would give IE, never AC, but it would still let a program sabotage its own run. The signals are relayed to a channel that nobody reads. They are deliberately not set to `SIG_IGN`, because ignored signals stay ignored across `exec` and would reach the candidate's program.
- **Non-dumpable before the key arrives.** The runner calls `prctl(PR_SET_DUMPABLE, 0)` before it reads the job, so the key is never readable through `/proc/1/mem`, `/proc/1/environ` or `/proc/1/fd`. `exec` resets the flag, so the candidate's program is unaffected.
- **Signed reports.** Each report line is `<HMAC-SHA256> <json>` with a sequence number, and the stream ends with a `done` report. A forged, altered, missing, reordered or replayed line, or a runner that dies early, gives IE after one retry, never AC.

## Limits and verdicts

- **Compilation: 15 s of CPU time, at most 31 s of wall time.** *Clarifies spec section 4, which says "15 s".* This is the spec's rule for tests (wall = 2 × CPU + 1 s) applied to the compiler. With only a wall-clock limit, a busy or slow machine turned correct code into CE: on Docker Desktop on a laptop, a 20-line solution took 9.6 s to compile on its one CPU, and over 15 s with three sandboxes running at once. If the compiler is killed at the wall-clock limit with CPU time to spare, the machine was overloaded: that is IE, which is retried. More than 15 s of CPU is CE.
- **The C++ image precompiles `<bits/stdc++.h>`.** That cut a typical compile from 8.6 s to 3.6 s on one CPU, and the image grows by 109 MB. g++ only uses the precompiled header when the flags match exactly, so the compile command in `internal/judge/language.go` and the one in `images/cpp/Dockerfile` must change together. With other flags, g++ quietly falls back to the plain header.
- **Memory is checked before time.** If a program is both over the memory limit and out of time, the verdict is MLE. Near the container's memory limit, the kernel spends its time trying to reclaim memory, so a program that runs out of memory usually looks slow as well. This was found by allocating 1 GB on Docker Desktop: page faults were slow enough that the program reached its 2 s CPU limit at 446 MB.
- **Peak memory includes the shim.** `memory_kb` comes from the program's `rusage`, which keeps the highest resident size across `exec`. That includes the moment when the shim ran, about 2 MB. A trivial C++ program reports about 3.6 MB.
- **A program that cannot start is RE.** For example, the program deleted its own binary during an earlier test. A compiler that cannot start is IE.
- **The 60-second budget.** The runner starts no new test once 60 s have passed since the first one. Tests that never ran count as not passed. If every test that ran passed, the overall verdict is TLE.
- **Integer division by zero only traps on x86-64.** On arm64 the hardware returns 0, so a C++ program that divides by zero gets WA, not RE, there. The integration tests expect that. A null pointer or an uncaught exception is RE on both.

## The sandbox

- **The docker CLI, not the Engine API.** There is no SDK dependency to keep in step with the daemon. The same code drives Docker Desktop and Docker Engine, with runc or runsc. The cost is about 100 ms per container for starting the CLI. Stage E's warm pool may move to the API.
- **`--pull never`.** Images are built ahead of time. A missing image is IE right away, not a slow pull in the middle of a submission.
- **`--log-driver none`.** Output is streamed to the worker and never stored on the host.
- **`/work` is a 64 MB tmpfs** owned by the sandbox user, mode 0700, and is the only place where files can be executed. **`/tmp`** is a 16 MB tmpfs with `noexec`.
- **Container names** are `verdict-<submission id>-<random hex>`.

## Known gaps

- **MLE is detected late (Stage C).** The container's memory limit is the problem's limit, plus the language's headroom, plus 64 MB (spec section 5, item 4). The OOM killer only stops a program when it reaches that, and peak RSS then gives MLE. On a normal host this takes a fraction of a second. On a slow, virtualized host, a memory hog can run out of time first; it still gets MLE if its peak RSS is over the limit. Stage C adds a watchdog that kills the program as soon as the container's memory use passes the problem's limit, together with the MLE integration tests.
- **The security suite, rate limits and metrics come in Stage D,** with a threat model that says what Verdict defends against and what it does not.
