//go:build linux

package runner

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"testing"
	"time"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/protocol"
)

// The test binary doubles as the shim and as helper processes.
func TestMain(m *testing.M) {
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case ShimArg:
			ShimMain(os.Args[2:])
		case "__nondumpable_child__":
			nonDumpableChild()
		case "__signal_child__":
			signalChild()
		}
	}
	os.Exit(m.Run())
}

var testKey = bytes.Repeat([]byte{1}, protocol.KeySize)

func limits() protocol.Limits {
	return protocol.Limits{
		CPUMS:       2000,
		WallMS:      5000,
		StackBytes:  64 << 20,
		FileBytes:   16 << 20,
		StdoutBytes: 1 << 20,
		StderrBytes: 4 << 10,
	}
}

func newConfig(t *testing.T) Config {
	t.Helper()
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	return Config{
		WorkDir: t.TempDir(),
		Shim:    []string{exe, ShimArg},
		Env:     []string{"PATH=/usr/local/bin:/usr/bin:/bin", "VERDICT_TEST=1"},
	}
}

// serve runs job with the given test inputs and returns its verified reports.
func serve(t *testing.T, cfg Config, job protocol.Job, inputs ...string) []protocol.Report {
	t.Helper()
	job.Version = protocol.Version
	job.Key = testKey
	if job.SourceName == "" {
		job.SourceName = "main.sh"
	}
	for _, in := range inputs {
		job.Tests = append(job.Tests, protocol.TestSpec{Size: int64(len(in))})
	}
	var stdin bytes.Buffer
	if err := json.NewEncoder(&stdin).Encode(job); err != nil {
		t.Fatal(err)
	}
	for _, in := range inputs {
		stdin.WriteString(in)
	}
	var stdout bytes.Buffer
	if err := Serve(cfg, &stdin, &stdout); err != nil {
		t.Fatalf("Serve: %v", err)
	}
	r := protocol.NewReader(&stdout, testKey)
	var reps []protocol.Report
	for {
		rep, err := r.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		reps = append(reps, rep)
	}
	if len(reps) == 0 || reps[len(reps)-1].Type != protocol.TypeDone {
		t.Fatalf("reports do not end with done: %+v", reps)
	}
	return reps
}

// runOne runs a shell script as the only test and returns what happened.
func runOne(t *testing.T, lim protocol.Limits, script, input string) protocol.Exec {
	t.Helper()
	job := protocol.Job{Run: protocol.Step{Argv: []string{"sh", "-c", script}, Limits: lim}}
	reps := serve(t, newConfig(t), job, input)
	if len(reps) != 2 || reps[0].Type != protocol.TypeTest || reps[0].Exec == nil {
		t.Fatalf("reports = %+v", reps)
	}
	return *reps[0].Exec
}

func TestCompileThenRunEachTest(t *testing.T) {
	job := protocol.Job{
		Source:  []byte("#!/bin/sh\ntr a-z A-Z\n"),
		Compile: &protocol.Step{Argv: []string{"chmod", "+x", "main.sh"}, Limits: limits()},
		Run:     protocol.Step{Argv: []string{"./main.sh"}, Limits: limits()},
	}
	reps := serve(t, newConfig(t), job, "hello\n", "", "second test\n")
	if len(reps) != 5 {
		t.Fatalf("got %d reports, want compile + 3 tests + done", len(reps))
	}
	if c := reps[0]; c.Type != protocol.TypeCompile || !c.Exec.Succeeded() {
		t.Fatalf("compile report = %+v", c)
	}
	for i, want := range []string{"HELLO\n", "", "SECOND TEST\n"} {
		rep := reps[i+1]
		if rep.Type != protocol.TypeTest || rep.Index != i+1 || !rep.Exec.Succeeded() || string(rep.Exec.Stdout) != want {
			t.Errorf("test %d: %+v, stdout %q, want %q", i+1, rep, rep.Exec.Stdout, want)
		}
	}
	if done := reps[4]; done.TestsRun != 3 || done.BudgetExceeded {
		t.Errorf("done report = %+v", done)
	}
}

func TestCompileFailureStopsBeforeTests(t *testing.T) {
	job := protocol.Job{
		Compile: &protocol.Step{Argv: []string{"sh", "-c", "echo 'main.sh:1: error: oops' >&2; echo more; exit 1"}, Limits: limits()},
		Run:     protocol.Step{Argv: []string{"./main.sh"}, Limits: limits()},
	}
	reps := serve(t, newConfig(t), job, "1\n")
	if len(reps) != 2 {
		t.Fatalf("got %d reports, want compile + done", len(reps))
	}
	c := reps[0].Exec
	if c.ExitCode != 1 || !strings.Contains(string(c.Stdout), "error: oops") || !strings.Contains(string(c.Stdout), "more") {
		t.Errorf("compile = %+v, output %q (stdout and stderr should be merged)", c, c.Stdout)
	}
	if reps[1].TestsRun != 0 {
		t.Errorf("done = %+v, want no tests run", reps[1])
	}
}

func TestEachTestGetsOnlyItsOwnInput(t *testing.T) {
	// The first program reads 5 bytes of a 1 MiB input and exits; the
	// second must still receive exactly its own input.
	job := protocol.Job{Run: protocol.Step{Argv: []string{"head", "-c", "5"}, Limits: limits()}}
	reps := serve(t, newConfig(t), job, strings.Repeat("x", 1<<20), "hello world")
	if got := string(reps[0].Exec.Stdout); got != "xxxxx" {
		t.Errorf("test 1 stdout = %q", got)
	}
	if got := string(reps[1].Exec.Stdout); got != "hello" {
		t.Errorf("test 2 stdout = %q, want %q", got, "hello")
	}
}

func TestExitCodeAndSignal(t *testing.T) {
	if e := runOne(t, limits(), "exit 3", ""); e.ExitCode != 3 || e.Signal != 0 {
		t.Errorf("exit 3: %+v", e)
	}
	if e := runOne(t, limits(), "kill -SEGV $$", ""); e.Signal != int(syscall.SIGSEGV) {
		t.Errorf("SIGSEGV: %+v", e)
	}
}

func TestStartError(t *testing.T) {
	job := protocol.Job{Run: protocol.Step{Argv: []string{"./missing"}, Limits: limits()}}
	e := serve(t, newConfig(t), job, "")[0].Exec
	if e.StartError == "" || e.ExitCode != 127 {
		t.Errorf("got %+v, want a start error", e)
	}
}

func TestWallClockLimitKillsTheWholeGroup(t *testing.T) {
	lim := limits()
	lim.WallMS = 300
	start := time.Now()
	// The background sleep keeps stdout open. Unless the whole process group
	// is killed, the runner would wait for it until the 2 s grace period.
	e := runOne(t, lim, "sleep 30 & sleep 30", "")
	if !e.TimedOut || e.Signal != int(syscall.SIGKILL) {
		t.Errorf("got %+v, want timed out and killed", e)
	}
	if took := time.Since(start); took > 1500*time.Millisecond {
		t.Errorf("took %v: a process in the group survived the kill", took)
	}
	if e.WallMS < 300 || e.WallMS > 1000 {
		t.Errorf("wall_ms = %d, want about 300", e.WallMS)
	}
}

func TestCPULimit(t *testing.T) {
	if testing.Short() {
		t.Skip("burns 2 s of CPU")
	}
	lim := limits()
	lim.CPUMS = 500 // RLIMIT_CPU: 0.5 s rounded up, plus 1 = 2 s
	lim.WallMS = 10_000
	e := runOne(t, lim, "while :; do :; done", "")
	if e.Signal != int(syscall.SIGXCPU) || e.TimedOut || e.CPUMS < 1500 {
		t.Errorf("got %+v, want SIGXCPU after about 2 s of CPU", e)
	}
}

func TestLimitsApplyBeforeTheProgramStarts(t *testing.T) {
	lim := limits()
	lim.CPUMS = 3000
	lim.StackBytes = 32 << 20
	e := runOne(t, lim, "ulimit -t; ulimit -s; ulimit -c", "")
	if got, want := string(e.Stdout), "4\n32768\n0\n"; got != want {
		t.Errorf("ulimit -t -s -c printed %q, want %q", got, want)
	}
}

func TestOutputLimit(t *testing.T) {
	lim := limits()
	lim.StdoutBytes = 1000
	e := runOne(t, lim, "yes", "")
	if !e.OutputExceeded || len(e.Stdout) != 1000 || e.Signal != int(syscall.SIGKILL) {
		t.Errorf("got %+v (%d bytes kept), want output exceeded and killed", e, len(e.Stdout))
	}
}

func TestStderrIsCappedButNotFatal(t *testing.T) {
	e := runOne(t, limits(), "head -c 100000 /dev/zero >&2; echo done", "")
	if len(e.Stderr) != 4096 || e.OutputExceeded || !e.Succeeded() || string(e.Stdout) != "done\n" {
		t.Errorf("got %+v with %d bytes of stderr", e, len(e.Stderr))
	}
}

func TestFileSizeLimit(t *testing.T) {
	lim := limits()
	lim.FileBytes = 1024
	e := runOne(t, lim, "exec head -c 4096 /dev/zero > big", "")
	if e.Signal != int(syscall.SIGXFSZ) {
		t.Errorf("got %+v, want SIGXFSZ", e)
	}
}

func TestProgramSeesOnlyItsEnvironmentAndStdio(t *testing.T) {
	t.Setenv("VERDICT_SECRET", "hunter2")
	e := runOne(t, limits(), "env", "")
	if out := string(e.Stdout); strings.Contains(out, "VERDICT_SECRET") || !strings.Contains(out, "VERDICT_TEST=1") {
		t.Errorf("environment leaked or missing:\n%s", out)
	}

	// Leak a descriptor into the runner itself: the program must not get it.
	leak, err := os.Open(os.DevNull)
	if err != nil {
		t.Fatal(err)
	}
	defer leak.Close()
	if _, _, errno := syscall.Syscall(syscall.SYS_FCNTL, leak.Fd(), syscall.F_SETFD, 0); errno != 0 {
		t.Fatal(errno)
	}
	// ls runs as a child of the shell and lists the shell's descriptors.
	e = runOne(t, limits(), "ls /proc/$$/fd", "")
	if got := string(e.Stdout); got != "0\n1\n2\n" {
		t.Errorf("open descriptors:\n%s\nwant only 0, 1 and 2", got)
	}
}

func TestBudgetStopsStartingTests(t *testing.T) {
	job := protocol.Job{BudgetMS: 1, Run: protocol.Step{Argv: []string{"sleep", "0.05"}, Limits: limits()}}
	reps := serve(t, newConfig(t), job, "", "", "")
	done := reps[len(reps)-1]
	if len(reps) != 2 || done.TestsRun != 1 || !done.BudgetExceeded {
		t.Errorf("reports = %+v, want one test, then done with the budget exceeded", reps)
	}
}

func TestBadJobs(t *testing.T) {
	good := protocol.Job{Version: protocol.Version, Key: testKey, SourceName: "main.sh", Run: protocol.Step{Argv: []string{"true"}, Limits: limits()}}
	encode := func(j protocol.Job) string {
		b, _ := json.Marshal(j)
		return string(b) + "\n"
	}
	noKey, oldVersion, badName := good, good, good
	noKey.Key = nil
	oldVersion.Version = 99
	badName.SourceName = "../escape.sh"
	cases := map[string]string{
		"not json":       "hello\n",
		"no key":         encode(noKey),
		"other version":  encode(oldVersion),
		"bad file name":  encode(badName),
		"no job at all":  "",
		"truncated line": `{"v":1`,
	}
	for name, in := range cases {
		t.Run(name, func(t *testing.T) {
			var out bytes.Buffer
			if err := Serve(newConfig(t), strings.NewReader(in), &out); err == nil {
				t.Fatal("Serve accepted a bad job")
			}
		})
	}
	t.Run("missing input", func(t *testing.T) {
		job := good
		job.Tests = []protocol.TestSpec{{Size: 100}}
		var out bytes.Buffer
		err := Serve(newConfig(t), strings.NewReader(encode(job)+"short"), &out)
		if err == nil || !strings.Contains(out.String(), `"type":"error"`) {
			t.Fatalf("err = %v, output %q: want an error report", err, out.String())
		}
	})
}

func TestNonDumpable(t *testing.T) {
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command(exe, "__nondumpable_child__")
	stdin, _ := cmd.StdinPipe()
	stdout, _ := cmd.StdoutPipe()
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() {
		stdin.Close()
		_ = cmd.Wait()
	}()
	line, _ := bufio.NewReader(stdout).ReadString('\n')
	if line != "dumpable=false\n" {
		t.Fatalf("child printed %q", line)
	}
	if os.Geteuid() == 0 {
		t.Skip("root can read any /proc entry; the rest needs an unprivileged user")
	}
	pid := cmd.Process.Pid
	for _, path := range []string{"environ", "mem", "fd"} {
		p := fmt.Sprintf("/proc/%d/%s", pid, path)
		var err error
		if path == "fd" {
			_, err = os.ReadDir(p)
		} else {
			_, err = os.ReadFile(p)
		}
		if !errors.Is(err, fs.ErrPermission) {
			t.Errorf("reading %s: err = %v, want permission denied", p, err)
		}
	}
}

func nonDumpableChild() {
	if err := SetNonDumpable(); err != nil {
		fmt.Println("error:", err)
		os.Exit(1)
	}
	d, err := Dumpable()
	if err != nil {
		fmt.Println("error:", err)
		os.Exit(1)
	}
	fmt.Printf("dumpable=%v\n", d)
	_, _ = io.Copy(io.Discard, os.Stdin) // stay alive until the test is done
	os.Exit(0)
}

func TestSurvivesSignals(t *testing.T) {
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command(exe, "__signal_child__")
	stdin, _ := cmd.StdinPipe()
	stdout, _ := cmd.StdoutPipe()
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	out := bufio.NewReader(stdout)
	if line, _ := out.ReadString('\n'); line != "ready\n" {
		t.Fatalf("child printed %q", line)
	}
	for _, sig := range []syscall.Signal{syscall.SIGTERM, syscall.SIGINT, syscall.SIGHUP, syscall.SIGQUIT, syscall.SIGUSR1, syscall.SIGSEGV, syscall.SIGABRT} {
		if err := cmd.Process.Signal(sig); err != nil {
			t.Fatalf("sending %v: %v", sig, err)
		}
	}
	time.Sleep(100 * time.Millisecond)
	stdin.Close()
	line, _ := out.ReadString('\n')
	if err := cmd.Wait(); err != nil || line != "alive\n" {
		t.Fatalf("child died: %v, printed %q", err, line)
	}
}

func signalChild() {
	CatchSignals()
	fmt.Println("ready")
	_, _ = io.Copy(io.Discard, os.Stdin)
	fmt.Println("alive")
	os.Exit(0)
}
