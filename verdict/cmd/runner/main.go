//go:build linux

// Command runner runs as PID 1 inside every sandbox container. It reads one
// job on stdin, compiles the submission, runs each test under limits and
// writes signed reports on stdout. See package protocol for the wire format
// and package runner for the details.
package main

import (
	"fmt"
	"os"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/runner"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == runner.ShimArg {
		runner.ShimMain(os.Args[2:]) // never returns
	}
	exe, err := os.Executable()
	if err != nil {
		fail(err)
	}
	// Before the job, and with it the signing key, is read.
	if err := runner.SetNonDumpable(); err != nil {
		fail(err)
	}
	runner.CatchSignals()
	if err := runner.Serve(runner.Sandbox(exe), os.Stdin, os.Stdout); err != nil {
		fail(err)
	}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "runner:", err)
	os.Exit(1)
}
