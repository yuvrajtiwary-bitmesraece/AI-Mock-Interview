//go:build linux

package runner

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"syscall"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/protocol"
)

// ShimArg as argv[1] makes the runner binary act as the shim.
const ShimArg = "__verdict_shim__"

// shimArgs encodes a step's limits for the shim's command line. None of this
// is secret: the job key never leaves the runner's memory.
func shimArgs(l protocol.Limits) []string {
	// RLIMIT_CPU counts whole seconds. Round up and add one: it is a backstop
	// that stops a busy loop, while the exact CPU time comes from rusage.
	cpu := (l.CPUMS+999)/1000 + 1
	return []string{
		strconv.FormatInt(cpu, 10),
		strconv.FormatInt(l.FileBytes, 10),
		strconv.FormatInt(l.StackBytes, 10),
	}
}

// ShimMain applies limits to the current process, then replaces it with the
// program that follows "--". It never returns.
//
// Go cannot run code between fork and exec, so the runner starts itself again
// in this mode. The limits are in place before the program runs its first
// instruction, and they survive exec.
//
// File descriptor 3 is a status pipe back to the runner. The shim writes "ok"
// once the limits are set, marks the pipe close-on-exec and execs the
// program, so after a successful exec the program holds only descriptors 0, 1
// and 2. If the exec fails, the reason follows the "ok". If "ok" never
// arrives, the limits could not be set and the program never ran.
func ShimMain(args []string) {
	status := os.NewFile(3, "status")
	fail := func(format string, a ...any) {
		fmt.Fprintf(status, format, a...)
		os.Exit(127)
	}
	if len(args) < 5 || args[3] != "--" {
		fail("usage: %s cpu_seconds file_bytes stack_bytes -- program [args]", ShimArg)
	}
	var n [3]uint64
	for i := range n {
		v, err := strconv.ParseUint(args[i], 10, 64)
		if err != nil || v == 0 {
			fail("bad limit %q", args[i])
		}
		n[i] = v
	}
	cpu, file, stack := n[0], n[1], n[2]
	limits := []struct {
		resource int
		cur, max uint64
	}{
		{syscall.RLIMIT_CORE, 0, 0},
		{syscall.RLIMIT_CPU, cpu, cpu + 1}, // SIGXCPU at cur, SIGKILL at max
		{syscall.RLIMIT_FSIZE, file, file},
		{syscall.RLIMIT_STACK, stack, stack},
	}
	for _, l := range limits {
		if err := syscall.Setrlimit(l.resource, &syscall.Rlimit{Cur: l.cur, Max: l.max}); err != nil {
			fail("setrlimit(%d): %v", l.resource, err)
		}
	}
	// If the container runs out of memory, the OOM killer should pick the
	// candidate's program, not the runner.
	_ = os.WriteFile("/proc/self/oom_score_adj", []byte("1000"), 0)

	if err := closeOnExecFrom3(); err != nil {
		fail("close descriptors: %v", err)
	}
	if _, err := status.Write([]byte("ok")); err != nil {
		os.Exit(126)
	}
	argv := args[4:]
	path, err := exec.LookPath(argv[0])
	if err == nil {
		err = syscall.Exec(path, argv, os.Environ())
	}
	fmt.Fprintf(status, "\n%s: %v", argv[0], err)
	os.Exit(127)
}

// closeOnExecFrom3 marks every descriptor from 3 up close-on-exec, the status
// pipe included, so the program inherits only stdin, stdout and stderr, even
// if the runner itself inherited more.
func closeOnExecFrom3() error {
	const (
		sysCloseRange     = 436 // the same number on amd64 and arm64
		closeRangeCloexec = 1 << 2
	)
	_, _, errno := syscall.Syscall(sysCloseRange, 3, uintptr(^uint32(0)), closeRangeCloexec)
	if errno == 0 {
		return nil
	}
	// Kernels before 5.11, or a seccomp profile without close_range.
	entries, err := os.ReadDir("/proc/self/fd")
	if err != nil {
		return err
	}
	for _, e := range entries {
		if fd, err := strconv.Atoi(e.Name()); err == nil && fd >= 3 {
			syscall.CloseOnExec(fd)
		}
	}
	return nil
}
