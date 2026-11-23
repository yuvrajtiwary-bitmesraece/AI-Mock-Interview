package judge

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/problems"
	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/protocol"
	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/sandbox"
)

// addProblem writes a problem whose answer is the sum of the numbers in the
// input: one sample and two hidden tests.
func addProblem(t *testing.T) *problems.Problem {
	t.Helper()
	dir := filepath.Join(t.TempDir(), "sum-it")
	files := map[string]string{
		"problem.yaml":     "title: Sum It\ndifficulty: easy\ntags: [math]\ntime_ms: 500\nmemory_mb: 64\n",
		"statement.md":     "Print the sum.\n",
		"samples/1.in":     "1 2\n",
		"samples/1.out":    "3\n",
		"tests/1.in":       "10 20\n",
		"tests/1.out":      "30\n",
		"tests/2.in":       "-5 5\n",
		"tests/2.out":      "0\n",
		"starter/main.cpp": "int main() {}\n",
	}
	for name, content := range files {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	p, err := problems.Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	return p
}

// fakeSandbox plays the runner: it decodes the job and the inputs, then
// sends the reports that script returns, signed with the job's key.
type fakeSandbox struct {
	mu     sync.Mutex
	calls  int
	jobs   []protocol.Job
	specs  []sandbox.Spec
	script func(call int, job protocol.Job, inputs []string, w *protocol.Writer, raw io.Writer) error
}

func (f *fakeSandbox) Run(ctx context.Context, spec sandbox.Spec, stdin io.Reader, stdout io.Writer) error {
	br := bufio.NewReader(stdin)
	line, err := br.ReadBytes('\n')
	if err != nil {
		return err
	}
	var job protocol.Job
	if err := json.Unmarshal(line, &job); err != nil {
		return err
	}
	var inputs []string
	for _, t := range job.Tests {
		b := make([]byte, t.Size)
		if _, err := io.ReadFull(br, b); err != nil {
			return err
		}
		inputs = append(inputs, string(b))
	}
	f.mu.Lock()
	f.calls++
	call := f.calls
	f.jobs = append(f.jobs, job)
	f.specs = append(f.specs, spec)
	f.mu.Unlock()
	return f.script(call, job, inputs, protocol.NewWriter(stdout, job.Key), stdout)
}

// sumAll answers every test correctly: the program sums its input.
func sumAll(_ int, job protocol.Job, inputs []string, w *protocol.Writer, _ io.Writer) error {
	if err := w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{WallMS: 900}}); err != nil {
		return err
	}
	for i, in := range inputs {
		if err := w.Write(protocol.Report{Type: protocol.TypeTest, Index: i + 1, Exec: &protocol.Exec{
			CPUMS: 5, WallMS: 6, MemoryKB: 3000, Stdout: []byte(sum(in) + "\n"),
		}}); err != nil {
			return err
		}
	}
	return w.Write(protocol.Report{Type: protocol.TypeDone, TestsRun: len(inputs)})
}

func sum(input string) string {
	total := 0
	for _, f := range strings.Fields(input) {
		n, _ := strconv.Atoi(f)
		total += n
	}
	return strconv.Itoa(total)
}

func newJudge(f *fakeSandbox) *Judge {
	return &Judge{Sandbox: f, Languages: Languages("test"), Runtime: "runc", Log: slog.New(slog.DiscardHandler)}
}

func judgeIt(t *testing.T, f *fakeSandbox, mode Mode) *Result {
	t.Helper()
	res, err := newJudge(f).Judge(context.Background(), Submission{
		ID: "s1", Problem: addProblem(t), Language: "cpp", Source: []byte("int main() {}"), Mode: mode,
	})
	if err != nil {
		t.Fatal(err)
	}
	return res
}

func TestSubmitAccepted(t *testing.T) {
	f := &fakeSandbox{script: sumAll}
	res := judgeIt(t, f, Submit)
	if res.Verdict != Accepted || res.Passed != 3 || res.Total != 3 || len(res.Tests) != 3 {
		t.Fatalf("result = %+v", res)
	}
	if res.CompileMS != 900 {
		t.Errorf("compile time = %d", res.CompileMS)
	}

	// Samples first, and only samples carry their data.
	s := res.Tests[0]
	if s.Kind != problems.Sample || s.Input == nil || *s.Input != "1 2\n" || *s.Expected != "3\n" || *s.Actual != "3\n" {
		t.Errorf("sample = %+v", s)
	}
	for _, h := range res.Tests[1:] {
		if h.Kind != problems.Hidden || h.Input != nil || h.Expected != nil || h.Actual != nil {
			t.Errorf("hidden test reveals data: %+v", h)
		}
	}
	out, _ := json.Marshal(res)
	for _, secret := range []string{"10 20", "30", "-5 5"} {
		if strings.Contains(string(out), strconv.Quote(secret+"\n")) {
			t.Errorf("JSON result contains hidden data %q: %s", secret, out)
		}
	}

	// The job and the container follow the spec.
	job, spec := f.jobs[0], f.specs[0]
	if lim := job.Run.Limits; lim.CPUMS != 500 || lim.WallMS != 2000 || lim.StackBytes != 64<<20 ||
		lim.StdoutBytes != 1<<20 || lim.StderrBytes != 4<<10 {
		t.Errorf("run limits = %+v", lim)
	}
	if job.Compile == nil || job.Compile.Limits.CPUMS != 15_000 || job.Compile.Limits.WallMS != 31_000 || job.Compile.Argv[0] != "g++" {
		t.Errorf("compile step = %+v", job.Compile)
	}
	if job.BudgetMS != 60_000 || len(job.Key) != protocol.KeySize || len(job.Tests) != 3 || job.SourceName != "main.cpp" {
		t.Errorf("job = %+v", job)
	}
	if spec.MemoryMB != 64+128+64 || spec.Image != "verdict-cpp:test" || spec.Runtime != "runc" ||
		!strings.HasPrefix(spec.Name, "verdict-s1-") {
		t.Errorf("spec = %+v", spec)
	}
}

func TestRunModeOnlySamples(t *testing.T) {
	f := &fakeSandbox{script: sumAll}
	res := judgeIt(t, f, Run)
	if res.Verdict != Accepted || res.Total != 1 || len(f.jobs[0].Tests) != 1 {
		t.Fatalf("result = %+v, job tests = %d", res, len(f.jobs[0].Tests))
	}
}

func TestEveryTestRunsAfterAFailure(t *testing.T) {
	f := &fakeSandbox{script: func(_ int, job protocol.Job, inputs []string, w *protocol.Writer, _ io.Writer) error {
		_ = w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{}})
		outputs := []string{"3", "31", "0"} // the first hidden test is wrong
		for i := range inputs {
			_ = w.Write(protocol.Report{Type: protocol.TypeTest, Index: i + 1, Exec: &protocol.Exec{Stdout: []byte(outputs[i])}})
		}
		return w.Write(protocol.Report{Type: protocol.TypeDone, TestsRun: len(inputs)})
	}}
	res := judgeIt(t, f, Submit)
	if res.Verdict != WrongAnswer || res.Passed != 2 || res.Total != 3 || len(res.Tests) != 3 {
		t.Fatalf("result = %+v", res)
	}
	if res.Tests[1].Verdict != WrongAnswer || res.Tests[2].Verdict != Accepted {
		t.Errorf("tests = %+v", res.Tests)
	}
}

func TestCompileError(t *testing.T) {
	f := &fakeSandbox{script: func(_ int, _ protocol.Job, _ []string, w *protocol.Writer, _ io.Writer) error {
		_ = w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{
			ExitCode: 1, Stdout: []byte("main.cpp:3:1: error: expected ';'\n" + strings.Repeat("x", 10_000)),
		}})
		return w.Write(protocol.Report{Type: protocol.TypeDone})
	}}
	res := judgeIt(t, f, Submit)
	if res.Verdict != CompileError || res.Passed != 0 || res.Total != 3 || len(res.Tests) != 0 {
		t.Fatalf("result = %+v", res)
	}
	if !strings.HasPrefix(res.CompileOutput, "main.cpp:3:1: error") || len(res.CompileOutput) != 4096 {
		t.Errorf("compile output (%d bytes) = %.60q", len(res.CompileOutput), res.CompileOutput)
	}
}

func TestCompileTooSlow(t *testing.T) {
	f := &fakeSandbox{script: func(_ int, _ protocol.Job, _ []string, w *protocol.Writer, _ io.Writer) error {
		_ = w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{Signal: sigXCPU, CPUMS: 15_400, WallMS: 15_900}})
		return w.Write(protocol.Report{Type: protocol.TypeDone})
	}}
	res := judgeIt(t, f, Run)
	if res.Verdict != CompileError || !strings.HasPrefix(res.CompileOutput, "Compilation took more than 15 seconds of CPU time.") {
		t.Fatalf("result = %+v", res)
	}
}

func TestStarvedCompilerIsNotTheCandidatesFault(t *testing.T) {
	f := &fakeSandbox{script: func(_ int, _ protocol.Job, _ []string, w *protocol.Writer, _ io.Writer) error {
		_ = w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{TimedOut: true, Signal: sigKILL, CPUMS: 4_000, WallMS: 31_000}})
		return w.Write(protocol.Report{Type: protocol.TypeDone})
	}}
	res := judgeIt(t, f, Run)
	if res.Verdict != InternalError || f.calls != 2 {
		t.Fatalf("verdict %s after %d runs, want IE after a retry", res.Verdict, f.calls)
	}
}

func TestBudgetRunsOut(t *testing.T) {
	f := &fakeSandbox{script: func(_ int, _ protocol.Job, inputs []string, w *protocol.Writer, _ io.Writer) error {
		_ = w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{}})
		_ = w.Write(protocol.Report{Type: protocol.TypeTest, Index: 1, Exec: &protocol.Exec{Stdout: []byte(sum(inputs[0]))}})
		return w.Write(protocol.Report{Type: protocol.TypeDone, TestsRun: 1, BudgetExceeded: true})
	}}
	res := judgeIt(t, f, Submit)
	if res.Verdict != TimeLimit || res.Passed != 1 || res.Total != 3 {
		t.Fatalf("result = %+v, want TLE with 1/3 passed", res)
	}
}

func TestInternalErrors(t *testing.T) {
	cases := map[string]func(int, protocol.Job, []string, *protocol.Writer, io.Writer) error{
		"forged AC output": func(_ int, _ protocol.Job, _ []string, _ *protocol.Writer, raw io.Writer) error {
			_, err := fmt.Fprintln(raw, `{"seq":0,"type":"done","tests_run":3}`)
			return err
		},
		"output from another key": func(_ int, _ protocol.Job, inputs []string, _ *protocol.Writer, raw io.Writer) error {
			return sumAll(0, protocol.Job{}, inputs, protocol.NewWriter(raw, []byte("not the job key, not at all!!!!")), raw)
		},
		"runner dies before done": func(_ int, _ protocol.Job, _ []string, w *protocol.Writer, _ io.Writer) error {
			return w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{}})
		},
		"runner reports an error": func(_ int, _ protocol.Job, _ []string, w *protocol.Writer, _ io.Writer) error {
			return w.Write(protocol.Report{Type: protocol.TypeError, Message: "disk full"})
		},
		"too few tests": func(_ int, _ protocol.Job, _ []string, w *protocol.Writer, _ io.Writer) error {
			_ = w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{}})
			return w.Write(protocol.Report{Type: protocol.TypeDone})
		},
		"test out of order": func(_ int, _ protocol.Job, _ []string, w *protocol.Writer, _ io.Writer) error {
			_ = w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{}})
			return w.Write(protocol.Report{Type: protocol.TypeTest, Index: 2, Exec: &protocol.Exec{}})
		},
		"compiler missing": func(_ int, _ protocol.Job, _ []string, w *protocol.Writer, _ io.Writer) error {
			return w.Write(protocol.Report{Type: protocol.TypeCompile, Exec: &protocol.Exec{StartError: "g++: not found", ExitCode: 127}})
		},
		"sandbox fails": func(int, protocol.Job, []string, *protocol.Writer, io.Writer) error {
			return errors.New("docker: image not found")
		},
	}
	for name, script := range cases {
		t.Run(name, func(t *testing.T) {
			f := &fakeSandbox{script: script}
			res := judgeIt(t, f, Submit)
			if res.Verdict != InternalError || res.Internal == "" || res.Passed != 0 || res.Total != 3 {
				t.Fatalf("result = %+v, want IE", res)
			}
			if f.calls != 2 {
				t.Errorf("ran %d times, want one retry", f.calls)
			}
		})
	}
}

func TestInternalErrorIsRetried(t *testing.T) {
	f := &fakeSandbox{script: func(call int, job protocol.Job, inputs []string, w *protocol.Writer, raw io.Writer) error {
		if call == 1 {
			return errors.New("container failed to start")
		}
		return sumAll(call, job, inputs, w, raw)
	}}
	res := judgeIt(t, f, Submit)
	if res.Verdict != Accepted || f.calls != 2 {
		t.Fatalf("verdict %s after %d runs, want AC after a retry", res.Verdict, f.calls)
	}
}

func TestRejectsBadSubmissions(t *testing.T) {
	j := newJudge(&fakeSandbox{script: sumAll})
	p := addProblem(t)
	cases := map[string]Submission{
		"unknown language": {Problem: p, Language: "cobol", Mode: Run},
		"unknown mode":     {Problem: p, Language: "cpp", Mode: "debug"},
		"no problem":       {Language: "cpp", Mode: Run},
		"source too large": {Problem: p, Language: "cpp", Mode: Run, Source: make([]byte, MaxSourceBytes+1)},
	}
	for name, sub := range cases {
		if _, err := j.Judge(context.Background(), sub); err == nil {
			t.Errorf("%s: no error", name)
		}
	}
}

func TestClipped(t *testing.T) {
	if got := *clipped([]byte("héllo"), 2); got != "h" {
		t.Errorf("clipped split a character: %q", got)
	}
	if got := *clipped([]byte("hello"), 10); got != "hello" {
		t.Errorf("clipped = %q", got)
	}
}

func TestContainerName(t *testing.T) {
	if got := containerName("a/b c:ü_1.2-3"); got != "a-b-c--_1.2-3" {
		t.Errorf("containerName = %q", got)
	}
	if got := containerName(strings.Repeat("x", 100)); len(got) != 40 {
		t.Errorf("containerName is %d characters long", len(got))
	}
}
