//go:build linux

package runner

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/protocol"
)

// Config holds what differs between the sandbox and the tests.
type Config struct {
	// WorkDir is the candidate's working directory: the source is written
	// there and every step runs there.
	WorkDir string
	// Shim starts this binary in shim mode: {path of the binary, ShimArg}.
	Shim []string
	// Env is the entire environment of the candidate's processes.
	Env []string
	// KillAll kills every other process after each step. It only takes
	// effect when the runner is PID 1, alone in its own PID namespace:
	// anywhere else kill(-1) would hit unrelated processes.
	KillAll bool
	// Cgroup is the container's cgroup directory, read to detect OOM kills.
	// Empty disables OOM detection.
	Cgroup string
}

// Sandbox returns the configuration inside the sandbox container, where exe
// is the path of the runner binary.
func Sandbox(exe string) Config {
	return Config{
		WorkDir: "/work",
		Shim:    []string{exe, ShimArg},
		Env: []string{
			"PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
			"HOME=/work",
			"TMPDIR=/tmp",
			"LANG=C.UTF-8",
		},
		KillAll: true,
		Cgroup:  "/sys/fs/cgroup",
	}
}

// Serve runs one job: it reads the Job and the test inputs from in, compiles
// the source, runs every test and writes signed reports to out.
//
// A failure after the job is decoded is also sent as a TypeError report. A job
// that cannot be decoded produces no reports at all; the worker treats both
// as internal errors.
func Serve(cfg Config, in io.Reader, out io.Writer) error {
	br := bufio.NewReaderSize(in, 64<<10)
	line, err := readLine(br, protocol.MaxJobLine)
	if err != nil {
		return fmt.Errorf("read job: %w", err)
	}
	var job protocol.Job
	if err := json.Unmarshal(line, &job); err != nil {
		return fmt.Errorf("decode job: %w", err)
	}
	if job.Version != protocol.Version {
		return fmt.Errorf("job version %d, runner speaks %d", job.Version, protocol.Version)
	}
	if len(job.Key) < 16 {
		return errors.New("job has no signing key")
	}
	w := protocol.NewWriter(out, job.Key)
	r := &runner{cfg: cfg, pid1: cfg.KillAll && os.Getpid() == 1}
	if err := r.serve(&job, br, w); err != nil {
		_ = w.Write(protocol.Report{Type: protocol.TypeError, Message: err.Error()})
		return err
	}
	return nil
}

type runner struct {
	cfg  Config
	pid1 bool // KillAll is set and this process is PID 1
}

func (r *runner) serve(job *protocol.Job, in *bufio.Reader, w *protocol.Writer) error {
	name := job.SourceName
	if name == "" || name != filepath.Base(name) || strings.HasPrefix(name, ".") {
		return fmt.Errorf("bad source name %q", name)
	}
	if err := os.WriteFile(filepath.Join(r.cfg.WorkDir, name), job.Source, 0o644); err != nil {
		return fmt.Errorf("write source: %w", err)
	}
	job.Source = nil

	if job.Compile != nil {
		res, err := r.exec(*job.Compile, nil, compileStep)
		if err != nil {
			return fmt.Errorf("compile: %w", err)
		}
		if err := w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &res}); err != nil {
			return err
		}
		if !res.Succeeded() {
			return w.Write(protocol.Report{Type: protocol.TypeDone})
		}
	}

	start := time.Now()
	budget := time.Duration(job.BudgetMS) * time.Millisecond
	run, exceeded := 0, false
	for i, t := range job.Tests {
		if budget > 0 && time.Since(start) >= budget {
			exceeded = true
			break
		}
		input := &io.LimitedReader{R: in, N: t.Size}
		res, err := r.exec(job.Run, input, testStep)
		if err != nil {
			return fmt.Errorf("test %d: %w", i+1, err)
		}
		// Skip whatever the program did not read, to reach the next input.
		if _, err := io.Copy(io.Discard, input); err != nil {
			return fmt.Errorf("test %d: read input: %w", i+1, err)
		}
		if input.N > 0 {
			return fmt.Errorf("test %d: input ended %d bytes early", i+1, input.N)
		}
		if err := w.Write(protocol.Report{Type: protocol.TypeTest, Index: i + 1, Exec: &res}); err != nil {
			return err
		}
		run++
	}
	return w.Write(protocol.Report{Type: protocol.TypeDone, TestsRun: run, BudgetExceeded: exceeded})
}

type stepKind int

const (
	// compileStep merges stdout and stderr and keeps the first
	// Limits.StdoutBytes; a chatty compiler is not killed.
	compileStep stepKind = iota
	// testStep keeps stdout and stderr apart and kills the program as soon
	// as its stdout passes Limits.StdoutBytes.
	testStep
)

// exec runs one step under its limits, feeding it stdin (nil for none). An
// error means the runner itself failed; anything the program did, including
// failing to start, is described in the returned Exec.
func (r *runner) exec(step protocol.Step, stdin io.Reader, kind stepKind) (res protocol.Exec, err error) {
	lim := step.Limits
	if len(step.Argv) == 0 {
		return res, errors.New("empty command")
	}
	if lim.CPUMS <= 0 || lim.WallMS <= 0 || lim.StackBytes <= 0 || lim.FileBytes <= 0 || lim.StdoutBytes <= 0 {
		return res, fmt.Errorf("incomplete limits %+v", lim)
	}

	var owned []*os.File // our ends of every pipe, closed on return
	defer func() {
		for _, f := range owned {
			f.Close()
		}
	}()
	pipe := func() (rd, wr *os.File, err error) {
		rd, wr, err = os.Pipe()
		if err == nil {
			owned = append(owned, rd, wr)
		}
		return rd, wr, err
	}
	inR, inW, err := pipe()
	if err != nil {
		return res, err
	}
	outR, outW, err := pipe()
	if err != nil {
		return res, err
	}
	errR, errW := outR, outW
	if kind == testStep {
		if errR, errW, err = pipe(); err != nil {
			return res, err
		}
	}
	statusR, statusW, err := pipe()
	if err != nil {
		return res, err
	}

	args := append([]string{}, r.cfg.Shim[1:]...)
	args = append(args, shimArgs(lim)...)
	args = append(args, "--")
	args = append(args, step.Argv...)
	cmd := exec.Command(r.cfg.Shim[0], args...)
	cmd.Dir = r.cfg.WorkDir
	cmd.Env = r.cfg.Env
	cmd.Stdin, cmd.Stdout, cmd.Stderr = inR, outW, errW
	cmd.ExtraFiles = []*os.File{statusW}
	// A process group of its own, so the whole tree can be killed at once.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	oomBefore := r.oomKills()
	start := time.Now()
	if err := cmd.Start(); err != nil {
		return res, fmt.Errorf("start: %w", err)
	}
	pid := cmd.Process.Pid
	// The child has its own copies now. Once ours are closed, the readers see
	// EOF as soon as every process that inherited a write end is gone.
	inR.Close()
	outW.Close()
	errW.Close()
	statusW.Close()

	var timedOut, exceeded atomic.Bool
	kill := func() {
		_ = cmd.Process.Signal(syscall.SIGKILL) // safe after exit: os.Process knows
		r.killGroup(pid)
	}
	timer := time.AfterFunc(time.Duration(lim.WallMS)*time.Millisecond, func() {
		timedOut.Store(true)
		kill()
	})
	defer timer.Stop()

	var readers sync.WaitGroup
	var stdout, stderr []byte
	readers.Go(func() {
		stdout = readCapped(outR, lim.StdoutBytes, func() {
			exceeded.Store(true)
			if kind == testStep {
				kill()
			}
		})
	})
	if kind == testStep {
		readers.Go(func() { stderr = readCapped(errR, lim.StderrBytes, nil) })
	}
	fed := make(chan struct{})
	go func() {
		defer close(fed)
		if stdin != nil {
			_, _ = io.Copy(inW, stdin) // stops early with EPIPE if the program exits
		}
		inW.Close()
	}()

	status, _ := io.ReadAll(statusR)
	_ = cmd.Wait() // the exit status and rusage are read from ProcessState
	res.WallMS = time.Since(start).Milliseconds()
	timer.Stop()

	// Nothing the program started may outlive the step.
	r.killGroup(pid)
	r.reap()
	// Outside a PID namespace a process can leave the group and keep a pipe
	// open; never wait for it for long.
	grace := time.Now().Add(2 * time.Second)
	_ = outR.SetReadDeadline(grace)
	_ = errR.SetReadDeadline(grace)
	_ = inW.SetWriteDeadline(time.Now())
	readers.Wait()
	<-fed

	if s := string(status); strings.HasPrefix(s, "ok") {
		res.StartError = strings.TrimSpace(strings.TrimPrefix(s, "ok"))
	} else {
		if s == "" {
			s = "the shim exited before applying limits"
		}
		return res, fmt.Errorf("shim: %s", strings.TrimSpace(s))
	}
	if ws, ok := cmd.ProcessState.Sys().(syscall.WaitStatus); ok {
		if ws.Signaled() {
			res.Signal = int(ws.Signal())
		} else {
			res.ExitCode = ws.ExitStatus()
		}
	}
	if ru, ok := cmd.ProcessState.SysUsage().(*syscall.Rusage); ok {
		res.CPUMS = milliseconds(ru.Utime) + milliseconds(ru.Stime)
		res.MemoryKB = int64(ru.Maxrss) // kilobytes on Linux
	}
	res.TimedOut = timedOut.Load()
	res.OutputExceeded = exceeded.Load()
	res.OOMKilled = r.oomKills() > oomBefore
	res.Stdout, res.Stderr = stdout, stderr
	return res, nil
}

// killGroup kills the step's process group and, as PID 1, every other
// process in the container, including any that left the group.
func (r *runner) killGroup(pid int) {
	_ = syscall.Kill(-pid, syscall.SIGKILL)
	if r.pid1 {
		// kill(-1) reaches every process we may signal except PID 1: us.
		_ = syscall.Kill(-1, syscall.SIGKILL)
	}
}

// reap collects exited children. Orphans of the candidate's program are
// re-parented to PID 1, so as PID 1 the runner must wait for them, or their
// zombies would use up the container's PID limit.
func (r *runner) reap() {
	if !r.pid1 {
		return
	}
	deadline := time.Now().Add(2 * time.Second)
	for {
		var ws syscall.WaitStatus
		pid, err := syscall.Wait4(-1, &ws, syscall.WNOHANG, nil)
		switch {
		case errors.Is(err, syscall.EINTR):
		case err != nil: // ECHILD: no children left
			return
		case pid > 0:
		case time.Now().After(deadline):
			return
		default: // children left, none exited yet
			time.Sleep(time.Millisecond)
		}
	}
}

// oomKills returns the cgroup's OOM-kill counter (cgroup v2, then v1).
func (r *runner) oomKills() int64 {
	if r.cfg.Cgroup == "" {
		return 0
	}
	for _, name := range []string{"memory.events", "memory/memory.oom_control"} {
		b, err := os.ReadFile(filepath.Join(r.cfg.Cgroup, name))
		if err != nil {
			continue
		}
		for line := range strings.Lines(string(b)) {
			if v, ok := strings.CutPrefix(line, "oom_kill "); ok {
				n, _ := strconv.ParseInt(strings.TrimSpace(v), 10, 64)
				return n
			}
		}
	}
	return 0
}

// readCapped reads f until EOF or a deadline, keeps the first limit bytes and
// calls over (if not nil) once, as soon as more than limit bytes arrive.
func readCapped(f *os.File, limit int64, over func()) []byte {
	var kept []byte
	var total int64
	buf := make([]byte, 32<<10)
	for {
		n, err := f.Read(buf)
		if n > 0 {
			if room := limit - int64(len(kept)); room > 0 {
				kept = append(kept, buf[:min(int64(n), room)]...)
			}
			total += int64(n)
			if total > limit && over != nil {
				over()
				over = nil
			}
		}
		if err != nil {
			return kept
		}
	}
}

// readLine reads one '\n'-terminated line of at most max bytes.
func readLine(br *bufio.Reader, max int) ([]byte, error) {
	var line []byte
	for {
		chunk, err := br.ReadSlice('\n')
		line = append(line, chunk...)
		if len(line) > max {
			return nil, fmt.Errorf("line longer than %d bytes", max)
		}
		switch {
		case err == nil:
			return line[:len(line)-1], nil
		case errors.Is(err, bufio.ErrBufferFull):
		default:
			return nil, err
		}
	}
}

func milliseconds(tv syscall.Timeval) int64 {
	return int64(tv.Sec)*1000 + int64(tv.Usec)/1000
}
