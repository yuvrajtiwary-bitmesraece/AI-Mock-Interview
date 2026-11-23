// Package runner is the code that runs inside the sandbox container, as
// PID 1: it compiles the submission and runs each test under limits, then
// reports what happened over the protocol in package protocol.
//
// It only builds on Linux. The worker, the CLI and everything else in Verdict
// build on any OS.
package runner
