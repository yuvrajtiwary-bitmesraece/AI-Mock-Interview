package judge

import (
	"testing"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/protocol"
)

func TestClassify(t *testing.T) {
	const cpuLimit, memLimit = 1000, 256 << 10
	ok := func() bool { return true }
	wrong := func() bool { return false }
	cases := []struct {
		name  string
		exec  protocol.Exec
		check func() bool
		want  Verdict
	}{
		{"correct", protocol.Exec{CPUMS: 10, MemoryKB: 4000}, ok, Accepted},
		{"wrong output", protocol.Exec{}, wrong, WrongAnswer},
		{"non-zero exit", protocol.Exec{ExitCode: 3}, ok, RuntimeError},
		{"segfault", protocol.Exec{Signal: sigSEGV}, ok, RuntimeError},
		{"could not start", protocol.Exec{StartError: "no such file", ExitCode: 127}, ok, RuntimeError},
		{"over the CPU limit but exited fine", protocol.Exec{CPUMS: 1001}, ok, TimeLimit},
		{"wall-clock kill", protocol.Exec{TimedOut: true, Signal: sigKILL, CPUMS: 5}, ok, TimeLimit},
		{"RLIMIT_CPU", protocol.Exec{Signal: sigXCPU, CPUMS: 999}, ok, TimeLimit},
		{"OOM kill", protocol.Exec{OOMKilled: true, Signal: sigKILL}, ok, MemoryLimit},
		{"peak RSS over the limit", protocol.Exec{MemoryKB: memLimit + 1}, ok, MemoryLimit},
		{"memory beats time", protocol.Exec{MemoryKB: memLimit * 2, TimedOut: true, CPUMS: 2500}, ok, MemoryLimit},
		{"printed too much", protocol.Exec{OutputExceeded: true, Signal: sigKILL}, ok, OutputLimit},
		{"output beats time", protocol.Exec{OutputExceeded: true, TimedOut: true}, ok, OutputLimit},
		{"file too large", protocol.Exec{Signal: sigXFSZ}, ok, OutputLimit},
		{"time beats a wrong answer", protocol.Exec{CPUMS: 1500}, wrong, TimeLimit},
		{"crash beats a wrong answer", protocol.Exec{Signal: sigABRT}, wrong, RuntimeError},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := classify(&c.exec, cpuLimit, memLimit, c.check); got != c.want {
				t.Errorf("classify(%+v) = %s, want %s", c.exec, got, c.want)
			}
		})
	}
}

func TestOverall(t *testing.T) {
	tests := func(vs ...Verdict) []TestResult {
		var ts []TestResult
		for _, v := range vs {
			ts = append(ts, TestResult{Verdict: v})
		}
		return ts
	}
	cases := []struct {
		tests []TestResult
		want  Verdict
	}{
		{tests(Accepted, Accepted), Accepted},
		{tests(Accepted, WrongAnswer, TimeLimit), WrongAnswer},
		{tests(TimeLimit, WrongAnswer), TimeLimit},
		{nil, Accepted},
	}
	for _, c := range cases {
		if got := overall(c.tests); got != c.want {
			t.Errorf("overall(%v) = %s, want %s", c.tests, got, c.want)
		}
	}
}
