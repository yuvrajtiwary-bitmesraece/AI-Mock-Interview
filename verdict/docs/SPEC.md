# Verdict: sandboxed code judge — spec v1

Verdict compiles and runs untrusted code against test cases and returns a verdict (Accepted, Wrong Answer, Time Limit Exceeded and so on). It powers the coding round in AI Mock Interview.

This file is the source of truth. If the code and this spec disagree, change one of them on purpose and record why in `docs/DESIGN.md`.

## 1. Scope

In v1:
- Languages: C++17, Python 3, Java 21. Go and JavaScript come later.
- Modes: `run` (sample tests only, with diffs) and `submit` (samples plus hidden tests; hidden test data is never revealed).
- A bank of 10 original interview-style problems that read stdin and write stdout.
- Public repo, MIT license.

Not in v1: custom checkers, interactive problems, multi-file projects, a browser-facing API. Verdict's callers are servers.

## 2. Architecture

```
AI Mock Interview server --HTTPS + API key--> cmd/api
cmd/api --XADD--> Redis Stream verdict:jobs --XREADGROUP--> cmd/worker (N goroutines)
cmd/worker --> one sandbox container per submission; cmd/runner inside it runs each test
cmd/worker --> result in Redis hash verdict:sub:{id} (TTL 24 h) <-- cmd/api serves status
```

- The sandbox runtime is configurable: `SANDBOX_RUNTIME=runc` for local development (Docker on any OS) and `runsc` (gVisor) on the Linux server.
- In production the worker runs as a host process (systemd). Never mount the Docker socket into a container that faces the internet.

Suggested layout:

```
cmd/api  cmd/worker  cmd/runner  cmd/verdictctl (dev CLI)
internal/{api,queue,sandbox,judge,problems,ratelimit,metrics}
images/{cpp,python,java}/Dockerfile    each image includes the runner binary
problems/{slug}/   tests/escape/   deploy/   docs/DESIGN.md
```

## 3. HTTP API

JSON in and out. Every endpoint except health checks requires `Authorization: Bearer $VERDICT_API_KEY`.

| Endpoint | What it does |
|---|---|
| `GET /v1/problems?difficulty=` | List problems: slug, title, difficulty, tags. |
| `GET /v1/problems/{slug}` | Statement (Markdown), constraints, sample tests, limits, starter code per language. Never hidden tests. |
| `POST /v1/submissions` | Body: `problem_slug`, `language` (`cpp`, `python`, `java`), `source` (max 64 KB), `mode` (`run` or `submit`), `client_user_id`. Returns `202 {"id", "status": "queued"}`. An optional `Idempotency-Key` header returns the same id for retries within 10 minutes. |
| `GET /v1/submissions/{id}` | `status` (`queued`, `running`, `done`), overall `verdict`, `passed`, `total`, `compile_output` (first 4 KB) and per-test results. |
| `GET /healthz`, `GET /readyz`, `GET /metrics` | Liveness, readiness (Redis reachable), Prometheus metrics. |

Each test result has `index`, `kind` (`sample` or `hidden`), `verdict`, `cpu_ms`, `wall_ms` and `memory_kb`. Sample tests also include `input`, `expected` and `actual`, each cut to 2 KB. Hidden tests never include input, expected or actual output.

Errors: 400 invalid body, 401 bad key, 404 unknown problem or submission, 413 source too large, 429 with `Retry-After` when the caller's rate limit is hit or the queue is full.

## 4. Verdicts and judging

- Verdicts: `AC`, `WA`, `TLE`, `MLE`, `RE`, `CE`, `OLE` (output limit) and `IE` (internal error: never the candidate's fault; retried once automatically).
- The overall verdict is the first non-AC test in order. Keep running after a failure so `passed/total` means something, but stop once the submission's total wall time passes 60 seconds.
- Checker: compare line by line after turning `\r\n` into `\n`, trimming trailing spaces on each line and dropping trailing blank lines. A problem can set `float_tolerance` (absolute or relative, e.g. 1e-6).
- Time: each problem sets a CPU-time limit per test, multiplied per language (defaults C++ ×1, Java ×2, Python ×3; configurable). The wall-clock limit is 2 × the CPU limit + 1 s. Exceeding either gives TLE.
- Memory: each problem sets a limit; each language gets configurable extra headroom (the JVM needs more).
- Compilation gets its own time limit (15 s) and output cap. Python is syntax-checked with `py_compile`, so syntax errors come back as CE, not RE. In Java the class must be `Main`; the starter code says so.

## 5. Sandbox — the core. Every item needs a test.

One container per submission: compile once, then the runner executes each test.

The container:
1. Has no network.
2. Has a read-only root filesystem, a writable tmpfs work directory (exec allowed, 64 MB cap) and a small tmpfs `/tmp`.
3. Runs as a non-root user, with all Linux capabilities dropped and no-new-privileges set.
4. Gets a memory limit of the problem limit plus language headroom plus 64 MB for the runner, with swap disabled; a PID limit of 128; and 1 CPU.
5. Has an empty environment: no host variables and no secrets.
6. Mounts only this problem's test *inputs*, read-only. Expected outputs never enter the container; the worker compares output outside it.
7. Is labeled `verdict=1` and is always removed when the job ends, including on timeouts and panics. On startup the worker removes labeled containers older than 5 minutes.

The runner (`cmd/runner`, a small static Go binary, PID 1 inside the container):
8. Reads its job (tests, limits and a per-job secret key) from stdin, never from arguments or environment variables.
9. Starts the candidate's program once per test, with stdin from the input file and stdout and stderr going to pipes. It closes every other file descriptor.
10. Applies per-test limits (CPU time, file size, stack equal to the memory limit) before the candidate's code starts running. Go can't run code between fork and exec, so use a re-exec shim or an equivalent: there must be no window where the program runs without limits.
11. Measures CPU time and peak memory from the child's rusage, and kills the child's whole process group at the wall-clock limit.
12. Caps captured stdout at 1 MB per test (beyond that is OLE) and stderr at 4 KB.
13. Detects MLE from the cgroup's `memory.events` oom_kill counter and/or peak RSS. A Java `OutOfMemoryError` also counts as MLE. Test this under runc now and under runsc in Stage E.
14. Makes itself non-dumpable (`prctl(PR_SET_DUMPABLE, 0)`) so the candidate's program can't read its memory, environment or file descriptors through `/proc`. It signs every result line with the per-job key so the program can't forge results.
15. If the runner dies or its output fails the signature check, the submission gets `IE` (retried) — never `AC`.

## 6. Queue and workers

- Redis Stream `verdict:jobs` with consumer group `workers`. Each worker process runs `WORKER_CONCURRENCY` goroutines (default 2 on a 1-core server). Trim the stream (approximate `MAXLEN` of 10,000).
- Write the result, then `XACK`. Delivery is at least once, so result writes must be idempotent (keyed by submission id).
- Every 30 s, `XAUTOCLAIM` jobs that have been idle longer than the longest possible job plus a margin (120 s), in case a worker crashed. After 3 failed attempts the verdict is `IE` and a copy goes to `verdict:dlq`.
- On SIGTERM: stop reading new jobs, finish in-flight ones (30 s at most), then exit.
- Backpressure: the API returns 429 when more than `MAX_QUEUE` jobs (default 200) are waiting or running.
- Rate limit per `client_user_id`: a token bucket in Redis using a Lua script (defaults 10 submissions per minute, 150 per day).

## 7. Problem bank

```
problems/{slug}/problem.yaml       title, difficulty, tags, time_ms, memory_mb, float_tolerance (optional)
problems/{slug}/statement.md
problems/{slug}/samples/{n}.in, {n}.out
problems/{slug}/tests/{n}.in, {n}.out      hidden
problems/{slug}/starter/main.cpp, main.py, Main.java
problems/{slug}/solutions/         reference solutions in all three languages, plus one brute force
problems/{slug}/gen/               test generator
```

- 10 original problems: 4 easy, 4 medium, 2 hard. Write the statements yourself; don't copy text from LeetCode or GeeksforGeeks.
- Each problem has at least 15 hidden tests, including edge cases and a maximum-size test that the brute force fails with TLE.
- CI runs every reference solution (must be AC on every test, in all three languages) and the brute force (must TLE on the max-size test).

## 8. Observability

- Prometheus metrics: `verdict_submissions_total{language,mode,verdict}`, `verdict_queue_depth`, `verdict_job_seconds` (histogram, enqueue to verdict), `verdict_sandbox_start_seconds`, `verdict_compile_seconds`, `verdict_internal_errors_total`.
- JSON logs via `log/slog`, tagged with the submission id. Never log source code.
- pprof on a debug port bound to localhost only.

## 9. Tests (all must pass in CI)

- Unit: the checker (table-driven, plus a `go test -fuzz` target), verdict aggregation, the rate limiter.
- Integration (needs Docker), for each language: AC, WA, TLE (infinite loop), MLE (allocate 1 GB), RE (divide by zero; null pointer or segfault), CE, OLE (print forever).
- Escape suite in `tests/escape/`. Each must end with the expected verdict and leave the host clean:
  fork bomb · connect to the internet and to the host's Redis · read `/etc/shadow` · read expected outputs or another problem's files · write 1 GB to disk · sleep for 10 minutes · start 1,000 threads · read the runner's `/proc/1/environ` and `/proc/1/fd` · print a forged "AC" result line · send signals to PID 1 · try setuid or sudo · submit 65 KB of source (413).
  After the suite, no containers are left behind.
- Run `go test -race ./...` everywhere.
- CI on GitHub Actions with x64 and arm64 runners. Build images for linux/amd64 and linux/arm64. Run the escape suite with runc, and with runsc if it installs on the runner.
- Later: a k6 load test that reports p50 and p95 enqueue-to-verdict time at fixed arrival rates, recorded in the README.

## 10. Stages — stop for review after each

- **A.** Runner and C++ only, end to end through the dev CLI (`verdictctl submit`), detecting AC, WA, TLE, RE and CE, with tests.
- **B.** API, Redis Streams and the worker; Docker Compose for Redis; idempotency; graceful shutdown.
- **C.** Python and Java; MLE and OLE; the problem bank and its CI checks.
- **D.** Escape suite, rate limits, backpressure and metrics. A README with an architecture diagram, curl examples and a threat model (what Verdict defends against and what it doesn't).
- **E.** Later, on the Linux server: gVisor, a warm pool of sandboxes, and k6 numbers.

## 11. Coding round in AI Mock Interview (Next.js side)

- Flow: the user picks a difficulty, the server fetches a problem from Verdict, and the page shows the statement and samples, a Monaco editor (`@monaco-editor/react`), a language picker with starter code, a 45-minute timer, **Run** (samples) and **Submit** (all tests). Render statements with a sanitizing Markdown renderer.
- Every Verdict call goes through server actions or route handlers using `VERDICT_URL` and `VERDICT_API_KEY`. The browser never sees the key or hidden tests. Poll status every second for up to 60 seconds.
- After the final submit, or when time runs out, make one Gemini call with the problem summary, the final code and a verdict summary (passed/total, failing verdict types, time and memory against limits). The response schema has `complexity_estimate`, `correctness_notes`, `follow_up_questions` (two), `score` (1–10) and `tips`. Treat the code as untrusted data and ignore any instructions written inside it. Never send hidden test contents.
- The candidate answers both follow-up questions, typed or through the existing speech-to-text. One more Gemini call grades the answers, then the app shows a final report.
- Drizzle table `coding_rounds`: `id`, `user_id`, `problem_slug`, `language`, `final_code`, `verdict_summary` (JSON), `ai_feedback` (JSON), `follow_ups` (JSON), `created_at`. Apply the same ownership checks as the rest of the app.
- A per-user submit limit, a `CODING_ROUND_ENABLED` feature flag, and a friendly "judge unavailable" state.
- A Playwright test that completes a coding round with a correct solution against a mocked Verdict.

## 12. Configuration

`VERDICT_API_KEY`, `REDIS_URL`, `SANDBOX_RUNTIME`, `WORKER_CONCURRENCY`, `MAX_QUEUE`, `RATE_LIMIT_PER_MIN`, `RATE_LIMIT_PER_DAY`, `PROBLEMS_DIR`, `LOG_LEVEL`.
