//go:build linux

package runner

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

const (
	prGetDumpable = 3
	prSetDumpable = 4
)

// SetNonDumpable stops other processes running as the same user (the
// candidate's program) from reading this process's memory, environment or
// file descriptors through /proc/<pid>, and from attaching with ptrace. The
// job key lives in the runner's memory. Exec resets the flag, so programs the
// runner starts are not affected.
func SetNonDumpable() error {
	if _, _, errno := syscall.RawSyscall6(syscall.SYS_PRCTL, prSetDumpable, 0, 0, 0, 0, 0); errno != 0 {
		return fmt.Errorf("prctl(PR_SET_DUMPABLE): %w", errno)
	}
	return nil
}

// Dumpable reports the current process's dumpable flag.
func Dumpable() (bool, error) {
	v, _, errno := syscall.RawSyscall6(syscall.SYS_PRCTL, prGetDumpable, 0, 0, 0, 0, 0)
	if errno != 0 {
		return false, fmt.Errorf("prctl(PR_GET_DUMPABLE): %w", errno)
	}
	return v != 0, nil
}

// CatchSignals keeps the runner alive whatever signal another process in the
// container sends it. The Go runtime installs a handler for every signal, so
// even as PID 1 the runner would otherwise exit on SIGTERM or crash on a
// SIGSEGV sent with kill. Every signal is relayed to a channel that nobody
// acts on. Ignoring them with SIG_IGN would also work, but ignored signals
// stay ignored across exec, and the candidate's program should start with the
// default disposition of every signal; handlers are reset by exec.
func CatchSignals() {
	c := make(chan os.Signal, 64)
	signal.Notify(c)
	go func() {
		for range c {
		}
	}()
}
