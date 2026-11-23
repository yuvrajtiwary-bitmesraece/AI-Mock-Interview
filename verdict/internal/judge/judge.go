// Package judge turns a submission into a verdict: it prepares the job,
// runs it in a sandbox, verifies the runner's signed reports and compares
// each test's output with the expected output, which never enters the
// sandbox.
package judge

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"os"
	"slices"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/problems"
	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/protocol"
	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/sandbox"
)

// Mode selects the tests a submission runs.
type Mode string

// Modes.
const (
	Run    Mode = "run"    // sample tests only
	Submit Mode = "submit" // sample tests, then hidden tests
)

// Limits shared by every submission (spec sections 3 to 5).
const (
	MaxSourceBytes = 64 << 10
	CompileTimeMS  = 15_000 // CPU time for the compiler; wall time is 2x + 1 s, as for tests
	BudgetMS       = 60_000 // no new test starts after this much time
	RunnerMB       = 64     // container memory for the runner itself

	compileWallMS = 2*CompileTimeMS + 1000
	stdoutLimit   = 1 << 20  // more is OLE
	stderrLimit   = 4 << 10  // more is discarded
	fileLimit     = 16 << 20 // largest file a program may write
	compileOutput = 64 << 10 // compiler output kept
	compileFiles  = 64 << 20 // largest file the compiler may write
	compileStack  = 64 << 20
	compileShown  = 4 << 10 // compile_output in a result
	sampleShown   = 2 << 10 // input, expected and actual of a sample
)

// Sandbox runs one sandbox container. sandbox.Docker implements it.
type Sandbox interface {
	Run(ctx context.Context, spec sandbox.Spec, stdin io.Reader, stdout io.Writer) error
}

// Judge judges submissions.
type Judge struct {
	Sandbox   Sandbox
	Languages map[string]Language
	Runtime   string       // sandbox runtime: "runc", "runsc", or "" for Docker's default
	Log       *slog.Logger // nil means slog.Default()
}

// Submission is one piece of code to judge.
type Submission struct {
	ID       string // for logs and the container name
	Problem  *problems.Problem
	Language string
	Source   []byte
	Mode     Mode
}

// Result is the outcome of a submission, in the shape of the API response.
type Result struct {
	Verdict       Verdict      `json:"verdict"`
	Passed        int          `json:"passed"`
	Total         int          `json:"total"`
	CompileOutput string       `json:"compile_output,omitempty"`
	Tests         []TestResult `json:"tests"`
	// CompileMS is how long compiling took, in wall time; for the CLI and
	// logs.
	CompileMS int64 `json:"-"`
	// Internal explains an internal error. For logs only: never shown to
	// the candidate.
	Internal string `json:"-"`
}

// TestResult is the outcome of one test. Only sample tests carry their
// input, the expected output and the actual output.
type TestResult struct {
	Index    int     `json:"index"`
	Kind     string  `json:"kind"`
	Verdict  Verdict `json:"verdict"`
	CPUMS    int64   `json:"cpu_ms"`
	WallMS   int64   `json:"wall_ms"`
	MemoryKB int64   `json:"memory_kb"`
	Input    *string `json:"input,omitempty"`
	Expected *string `json:"expected,omitempty"`
	Actual   *string `json:"actual,omitempty"`
	// Detail says how the program failed, e.g. "killed by SIGSEGV". For the
	// CLI and logs.
	Detail string `json:"-"`
}

// Judge runs a submission. It only returns an error for a submission that
// cannot be judged at all, such as an unknown language. Everything else is in
// the Result, including an internal error that persisted after one retry.
func (j *Judge) Judge(ctx context.Context, sub Submission) (*Result, error) {
	lang, ok := j.Languages[sub.Language]
	switch {
	case !ok:
		return nil, fmt.Errorf("unknown language %q", sub.Language)
	case sub.Mode != Run && sub.Mode != Submit:
		return nil, fmt.Errorf("unknown mode %q", sub.Mode)
	case sub.Problem == nil:
		return nil, errors.New("no problem")
	case len(sub.Source) > MaxSourceBytes:
		return nil, fmt.Errorf("the source is %d bytes, over the limit of %d", len(sub.Source), MaxSourceBytes)
	}
	log := j.log().With("submission", sub.ID, "problem", sub.Problem.Slug, "language", sub.Language, "mode", sub.Mode)
	res := j.attempt(ctx, sub, lang)
	if res.Verdict == InternalError && ctx.Err() == nil {
		log.Warn("internal error, retrying", "error", res.Internal)
		res = j.attempt(ctx, sub, lang)
	}
	if res.Verdict == InternalError {
		log.Error("internal error", "error", res.Internal)
	} else {
		log.Info("judged", "verdict", res.Verdict, "passed", res.Passed, "total", res.Total)
	}
	return res, nil
}

func (j *Judge) log() *slog.Logger {
	if j.Log != nil {
		return j.Log
	}
	return slog.Default()
}

func (j *Judge) attempt(ctx context.Context, sub Submission, lang Language) *Result {
	p := sub.Problem
	tests := p.Samples
	if sub.Mode == Submit {
		tests = append(slices.Clone(p.Samples), p.Hidden...)
	}
	fail := func(err error) *Result {
		return &Result{Verdict: InternalError, Total: len(tests), Tests: []TestResult{}, Internal: err.Error()}
	}

	sizes := make([]int64, len(tests))
	for i, t := range tests {
		fi, err := os.Stat(t.Input)
		if err != nil {
			return fail(err)
		}
		sizes[i] = fi.Size()
	}

	cpuMS := int64(math.Ceil(float64(p.TimeMS) * lang.TimeFactor))
	limits := protocol.Limits{
		CPUMS:       cpuMS,
		WallMS:      2*cpuMS + 1000,
		StackBytes:  p.MemoryMB << 20,
		FileBytes:   fileLimit,
		StdoutBytes: stdoutLimit,
		StderrBytes: stderrLimit,
	}
	key := make([]byte, protocol.KeySize)
	_, _ = rand.Read(key) // never fails
	job := protocol.Job{
		Version:    protocol.Version,
		Key:        key,
		SourceName: lang.SourceName,
		Source:     sub.Source,
		Run:        protocol.Step{Argv: lang.Run, Limits: limits},
		BudgetMS:   BudgetMS,
	}
	if lang.Compile != nil {
		job.Compile = &protocol.Step{Argv: lang.Compile, Limits: protocol.Limits{
			CPUMS:       CompileTimeMS,
			WallMS:      compileWallMS,
			StackBytes:  compileStack,
			FileBytes:   compileFiles,
			StdoutBytes: compileOutput,
			StderrBytes: compileOutput,
		}}
	}
	for _, size := range sizes {
		job.Tests = append(job.Tests, protocol.TestSpec{Size: size})
	}
	header, err := json.Marshal(job)
	if err != nil {
		return fail(err)
	}

	spec := sandbox.Spec{
		Name:     "verdict-" + containerName(sub.ID) + "-" + randomHex(4),
		Image:    lang.Image,
		Runtime:  j.Runtime,
		MemoryMB: p.MemoryMB + lang.HeadroomMB + RunnerMB,
	}
	// The longest a healthy job can take: compiling, the test budget, one
	// test that starts just before the budget runs out, and time to start
	// and remove the container.
	deadline := time.Duration(compileWallMS+BudgetMS+limits.WallMS)*time.Millisecond + 30*time.Second
	ctx, cancel := context.WithTimeout(ctx, deadline)
	defer cancel()

	stdin := &inputStream{header: append(header, '\n'), tests: tests, sizes: sizes}
	defer stdin.Close()
	pr, pw := io.Pipe()
	ran := make(chan error, 1)
	go func() {
		err := j.Sandbox.Run(ctx, spec, stdin, pw)
		pw.CloseWithError(err) // nil: the reader sees EOF
		ran <- err
	}()

	res, err := collect(protocol.NewReader(pr, key), tests, p, lang, limits)
	if err != nil {
		cancel() // nobody will read the rest: stop the container now
	}
	pr.CloseWithError(errors.New("judge: stopped reading")) // unblock the sandbox if it is still writing
	if runErr := <-ran; err != nil {
		if runErr != nil {
			err = fmt.Errorf("%v; %v", err, runErr)
		}
		return fail(err)
	}
	return res
}

// collect reads the runner's reports and builds the result. Any report out
// of place is an error: the result must come from a runner that finished.
func collect(r *protocol.Reader, tests []problems.Test, p *problems.Problem, lang Language, lim protocol.Limits) (*Result, error) {
	res := &Result{Total: len(tests), Tests: []TestResult{}}
	compiled := lang.Compile == nil
	for {
		rep, err := r.Next()
		if errors.Is(err, io.EOF) {
			return nil, errors.New("the runner stopped before reporting that it was done")
		}
		if err != nil {
			return nil, err
		}
		switch rep.Type {
		case protocol.TypeCompile:
			if compiled || rep.Exec == nil {
				return nil, errors.New("unexpected compile report")
			}
			compiled = true
			res.CompileMS = rep.Exec.WallMS
			if rep.Exec.StartError != "" {
				return nil, fmt.Errorf("the compiler did not start: %s", rep.Exec.StartError)
			}
			if rep.Exec.TimedOut && rep.Exec.CPUMS < CompileTimeMS {
				// Killed at the wall-clock limit with CPU time to spare: the
				// machine was overloaded, which is not the candidate's fault.
				return nil, fmt.Errorf("the compiler got %d ms of CPU in %d ms", rep.Exec.CPUMS, rep.Exec.WallMS)
			}
			if !rep.Exec.Succeeded() {
				res.Verdict = CompileError
				res.CompileOutput = compileMessage(rep.Exec)
			}
		case protocol.TypeTest:
			if !compiled || res.Verdict == CompileError || rep.Exec == nil ||
				rep.Index != len(res.Tests)+1 || rep.Index > len(tests) {
				return nil, fmt.Errorf("unexpected report for test %d", rep.Index)
			}
			t, err := judgeTest(rep.Index, tests[rep.Index-1], rep.Exec, p, lim)
			if err != nil {
				return nil, err
			}
			res.Tests = append(res.Tests, t)
		case protocol.TypeDone:
			if !compiled || rep.TestsRun != len(res.Tests) ||
				(len(res.Tests) < len(tests) && res.Verdict != CompileError && !rep.BudgetExceeded) {
				return nil, fmt.Errorf("the runner reported %d of %d tests as done, %d were seen", rep.TestsRun, len(tests), len(res.Tests))
			}
			if res.Verdict == CompileError {
				return res, nil
			}
			for _, t := range res.Tests {
				if t.Verdict == Accepted {
					res.Passed++
				}
			}
			res.Verdict = overall(res.Tests)
			if res.Verdict == Accepted && len(res.Tests) < len(tests) {
				// Every test that ran passed, but the time budget ran out
				// before the others: the submission is too slow overall.
				res.Verdict = TimeLimit
			}
			return res, nil
		case protocol.TypeError:
			return nil, fmt.Errorf("runner: %s", rep.Message)
		default:
			return nil, fmt.Errorf("unknown report type %q", rep.Type)
		}
	}
}

// judgeTest gives one test its verdict. The expected output is read here,
// outside the sandbox.
func judgeTest(index int, t problems.Test, e *protocol.Exec, p *problems.Problem, lim protocol.Limits) (TestResult, error) {
	var expected []byte
	var readErr error
	check := func() bool {
		expected, readErr = os.ReadFile(t.Output)
		return readErr == nil && Check(expected, e.Stdout, p.FloatTolerance)
	}
	v := classify(e, lim.CPUMS, p.MemoryMB*1024, check)
	if readErr != nil {
		return TestResult{}, readErr
	}
	res := TestResult{
		Index:    index,
		Kind:     t.Kind,
		Verdict:  v,
		CPUMS:    e.CPUMS,
		WallMS:   e.WallMS,
		MemoryKB: e.MemoryKB,
		Detail:   describe(e, v),
	}
	if t.Kind != problems.Sample {
		return res, nil // hidden tests never reveal their data
	}
	input, err := os.ReadFile(t.Input)
	if err != nil {
		return TestResult{}, err
	}
	if expected == nil {
		if expected, err = os.ReadFile(t.Output); err != nil {
			return TestResult{}, err
		}
	}
	res.Input = clipped(input, sampleShown)
	res.Expected = clipped(expected, sampleShown)
	res.Actual = clipped(e.Stdout, sampleShown)
	return res, nil
}

func compileMessage(e *protocol.Exec) string {
	var b strings.Builder
	switch {
	case e.TimedOut || e.Signal == sigXCPU || e.CPUMS >= CompileTimeMS:
		fmt.Fprintf(&b, "Compilation took more than %d seconds of CPU time.\n", CompileTimeMS/1000)
	case e.OOMKilled:
		b.WriteString("The compiler ran out of memory.\n")
	case e.Signal != 0:
		fmt.Fprintf(&b, "The compiler was killed by %s.\n", signalName(e.Signal))
	}
	b.Write(e.Stdout)
	return *clipped([]byte(b.String()), compileShown)
}

// clipped returns at most n bytes of b as a string, without splitting a
// UTF-8 character.
func clipped(b []byte, n int) *string {
	if len(b) > n {
		for n > 0 && !utf8.RuneStart(b[n]) {
			n--
		}
		b = b[:n]
	}
	s := string(b)
	return &s
}

// containerName keeps the characters Docker allows in a container name.
func containerName(id string) string {
	var b strings.Builder
	for _, r := range id {
		if b.Len() == 40 {
			break
		}
		if r < 128 && (r == '-' || r == '_' || r == '.' || 'a' <= r && r <= 'z' || 'A' <= r && r <= 'Z' || '0' <= r && r <= '9') {
			b.WriteRune(r)
		} else {
			b.WriteByte('-')
		}
	}
	return b.String()
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// inputStream is the runner's stdin: the job line, then the input of every
// test, back to back. Files are opened one at a time, when the runner gets to
// them.
type inputStream struct {
	mu     sync.Mutex
	header []byte
	tests  []problems.Test
	sizes  []int64
	next   int
	cur    *os.File
	left   int64
}

func (s *inputStream) Read(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for {
		if len(s.header) > 0 {
			n := copy(p, s.header)
			s.header = s.header[n:]
			return n, nil
		}
		if s.cur == nil {
			if s.next == len(s.tests) {
				return 0, io.EOF
			}
			f, err := os.Open(s.tests[s.next].Input)
			if err != nil {
				return 0, err
			}
			s.cur, s.left = f, s.sizes[s.next]
			s.next++
		}
		if s.left == 0 {
			s.cur.Close()
			s.cur = nil
			continue
		}
		if int64(len(p)) > s.left {
			p = p[:s.left]
		}
		n, err := s.cur.Read(p)
		s.left -= int64(n)
		if n > 0 {
			return n, nil
		}
		if err == nil || errors.Is(err, io.EOF) {
			return 0, fmt.Errorf("%s shrank while it was being sent", s.tests[s.next-1].Input)
		}
		return 0, err
	}
}

func (s *inputStream) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cur != nil {
		s.cur.Close()
		s.cur = nil
	}
	s.next, s.header = len(s.tests), nil
	return nil
}
