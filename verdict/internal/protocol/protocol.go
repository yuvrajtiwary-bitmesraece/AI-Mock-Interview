// Package protocol defines what the worker and the runner say to each other.
//
// The worker starts one sandbox container per submission and writes to the
// runner's stdin: a Job as one line of JSON, then the input of every test,
// back to back, with the sizes announced in Job.Tests. Test inputs never touch
// the container's filesystem: the runner streams each one into the
// candidate's stdin when that test starts, so a program can only ever see the
// input of the test it is running.
//
// The runner answers on stdout with one line per Report: "<mac> <json>\n",
// where mac is the hex HMAC-SHA256 of the JSON under Job.Key, a random key
// that only the worker and the runner know. Reports carry a sequence number
// and the stream ends with a "done" report, so a missing, reordered, replayed
// or forged line is detected and the submission ends as an internal error,
// never as Accepted.
package protocol

import (
	"bufio"
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

// Version changes whenever Job or Report change incompatibly.
const Version = 1

// KeySize is the length of the per-job HMAC key in bytes.
const KeySize = 32

// MaxJobLine bounds the Job line: 64 KiB of source, base64-encoded, plus the
// JSON around it.
const MaxJobLine = 1 << 20

// MaxReportLine bounds one report line: 1 MiB of stdout and 4 KiB of stderr,
// base64-encoded, plus the JSON around them.
const MaxReportLine = 4 << 20

// Job is everything the runner needs. It arrives on stdin, never through
// arguments or environment variables.
type Job struct {
	Version    int    `json:"v"`
	Key        []byte `json:"key"`
	SourceName string `json:"source_name"` // file name in the work directory, e.g. "main.cpp"
	Source     []byte `json:"source"`
	// Compile is nil for a language without a compile step.
	Compile *Step `json:"compile,omitempty"`
	Run     Step  `json:"run"`
	// BudgetMS stops the runner from starting new tests once this much wall
	// time has passed since the first test started. Zero means no budget.
	BudgetMS int64      `json:"budget_ms"`
	Tests    []TestSpec `json:"tests"`
}

// Step is one program and the limits it runs under.
type Step struct {
	Argv   []string `json:"argv"`
	Limits Limits   `json:"limits"`
}

// Limits apply to one execution of a step. CPU time, file size and stack are
// set as rlimits before the program's first instruction runs.
type Limits struct {
	CPUMS       int64 `json:"cpu_ms"`       // CPU time; RLIMIT_CPU is set just above it
	WallMS      int64 `json:"wall_ms"`      // the program's process group is killed at this wall time
	StackBytes  int64 `json:"stack_bytes"`  // RLIMIT_STACK
	FileBytes   int64 `json:"file_bytes"`   // RLIMIT_FSIZE: the largest file the program may write
	StdoutBytes int64 `json:"stdout_bytes"` // stdout kept; for a test, writing more is an output-limit failure
	StderrBytes int64 `json:"stderr_bytes"` // stderr kept; the rest is read and discarded
}

// TestSpec announces one test input that follows the Job on stdin.
type TestSpec struct {
	Size int64 `json:"size"`
}

// Report types, in the order the runner sends them.
const (
	TypeCompile = "compile" // the compile step finished (only if Job.Compile is set)
	TypeTest    = "test"    // one test finished
	TypeDone    = "done"    // the job finished; nothing follows
	TypeError   = "error"   // the runner failed; nothing follows
)

// Report is one line of runner output.
type Report struct {
	Seq  int    `json:"seq"`
	Type string `json:"type"`

	// Index is the 1-based position of the test in Job.Tests (TypeTest).
	Index int `json:"index,omitempty"`
	// Exec describes the finished program (TypeCompile and TypeTest).
	Exec *Exec `json:"exec,omitempty"`

	// TestsRun and BudgetExceeded summarize the job (TypeDone).
	TestsRun       int  `json:"tests_run,omitempty"`
	BudgetExceeded bool `json:"budget_exceeded,omitempty"`

	// Message says why the runner failed (TypeError).
	Message string `json:"message,omitempty"`
}

// Exec is what happened to one program run. The runner reports facts; the
// worker, which knows the expected output, turns them into a verdict.
type Exec struct {
	ExitCode int   `json:"exit_code"`
	Signal   int   `json:"signal,omitempty"` // the signal that killed the program, if any
	CPUMS    int64 `json:"cpu_ms"`
	WallMS   int64 `json:"wall_ms"`
	MemoryKB int64 `json:"memory_kb"` // peak resident set size

	TimedOut       bool `json:"timed_out,omitempty"`       // killed at the wall-clock limit
	OutputExceeded bool `json:"output_exceeded,omitempty"` // wrote more than Limits.StdoutBytes
	OOMKilled      bool `json:"oom_killed,omitempty"`      // the cgroup's OOM killer fired during the run

	// StartError is set when the program could not be started at all, for
	// example because the file does not exist.
	StartError string `json:"start_error,omitempty"`

	Stdout []byte `json:"stdout,omitempty"`
	Stderr []byte `json:"stderr,omitempty"`
}

// Succeeded reports whether the program ran and exited with status 0.
func (e *Exec) Succeeded() bool {
	return e.StartError == "" && !e.TimedOut && !e.OOMKilled && e.Signal == 0 && e.ExitCode == 0
}

// Writer signs reports and writes them, one per line.
type Writer struct {
	w   io.Writer
	key []byte
	seq int
}

// NewWriter returns a Writer that signs with key.
func NewWriter(w io.Writer, key []byte) *Writer {
	return &Writer{w: w, key: key}
}

// Write numbers, signs and writes r.
func (w *Writer) Write(r Report) error {
	r.Seq = w.seq
	payload, err := json.Marshal(r)
	if err != nil {
		return err
	}
	line := make([]byte, 0, 2*sha256.Size+len(payload)+2)
	line = hex.AppendEncode(line, sign(w.key, payload))
	line = append(line, ' ')
	line = append(line, payload...)
	line = append(line, '\n')
	if _, err := w.w.Write(line); err != nil {
		return err
	}
	w.seq++
	return nil
}

func sign(key, payload []byte) []byte {
	h := hmac.New(sha256.New, key)
	h.Write(payload)
	return h.Sum(nil)
}

// ErrBadReport means a line was malformed, unsigned, forged, out of order or
// too long. The worker treats it as an internal error.
var ErrBadReport = errors.New("bad runner report")

// Reader reads and verifies reports.
type Reader struct {
	s   *bufio.Scanner
	key []byte
	seq int
}

// NewReader returns a Reader that verifies with key.
func NewReader(r io.Reader, key []byte) *Reader {
	s := bufio.NewScanner(r)
	s.Buffer(make([]byte, 0, 64<<10), MaxReportLine)
	return &Reader{s: s, key: key}
}

// Next returns the next verified report, or io.EOF when the stream ends.
func (r *Reader) Next() (Report, error) {
	if !r.s.Scan() {
		if err := r.s.Err(); err != nil {
			return Report{}, fmt.Errorf("%w: %v", ErrBadReport, err)
		}
		return Report{}, io.EOF
	}
	sum, payload, ok := bytes.Cut(r.s.Bytes(), []byte{' '})
	if !ok || len(sum) != 2*sha256.Size {
		return Report{}, fmt.Errorf("%w: line %d is not signed", ErrBadReport, r.seq)
	}
	want := make([]byte, sha256.Size)
	if _, err := hex.Decode(want, sum); err != nil {
		return Report{}, fmt.Errorf("%w: line %d is not signed", ErrBadReport, r.seq)
	}
	if !hmac.Equal(want, sign(r.key, payload)) {
		return Report{}, fmt.Errorf("%w: line %d has a bad signature", ErrBadReport, r.seq)
	}
	var rep Report
	if err := json.Unmarshal(payload, &rep); err != nil {
		return Report{}, fmt.Errorf("%w: line %d: %v", ErrBadReport, r.seq, err)
	}
	if rep.Seq != r.seq {
		return Report{}, fmt.Errorf("%w: expected report %d, got %d", ErrBadReport, r.seq, rep.Seq)
	}
	r.seq++
	return rep, nil
}
