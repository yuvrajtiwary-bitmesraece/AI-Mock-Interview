package judge

import (
	"fmt"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/protocol"
)

// Verdict is the outcome of one test or of a whole submission.
type Verdict string

// Verdicts (spec section 4).
const (
	Accepted      Verdict = "AC"
	WrongAnswer   Verdict = "WA"
	TimeLimit     Verdict = "TLE"
	MemoryLimit   Verdict = "MLE"
	RuntimeError  Verdict = "RE"
	CompileError  Verdict = "CE"
	OutputLimit   Verdict = "OLE"
	InternalError Verdict = "IE" // never the candidate's fault
)

// Name returns the verdict in words.
func (v Verdict) Name() string {
	switch v {
	case Accepted:
		return "Accepted"
	case WrongAnswer:
		return "Wrong Answer"
	case TimeLimit:
		return "Time Limit Exceeded"
	case MemoryLimit:
		return "Memory Limit Exceeded"
	case RuntimeError:
		return "Runtime Error"
	case CompileError:
		return "Compilation Error"
	case OutputLimit:
		return "Output Limit Exceeded"
	case InternalError:
		return "Internal Error"
	}
	return string(v)
}

// Linux signal numbers, the same on amd64 and arm64. They are spelled out
// because this package also builds on Windows.
const (
	sigILL  = 4
	sigTRAP = 5
	sigABRT = 6
	sigBUS  = 7
	sigFPE  = 8
	sigKILL = 9
	sigSEGV = 11
	sigXCPU = 24
	sigXFSZ = 25
)

var signalNames = map[int]string{
	sigILL: "SIGILL", sigTRAP: "SIGTRAP", sigABRT: "SIGABRT", sigBUS: "SIGBUS", sigFPE: "SIGFPE",
	sigKILL: "SIGKILL", sigSEGV: "SIGSEGV", sigXCPU: "SIGXCPU", sigXFSZ: "SIGXFSZ",
}

func signalName(sig int) string {
	if name, ok := signalNames[sig]; ok {
		return name
	}
	return fmt.Sprintf("signal %d", sig)
}

// classify turns what the runner saw into the verdict of one test. The order
// matters. A program killed for printing too much is OLE, although SIGKILL
// ended it. Memory comes before time: a program near the container's memory
// limit slows to a crawl while the kernel reclaims memory, so running out of
// memory often looks like running out of time as well. A program over the
// time limit is TLE whatever it printed. check compares the output and is
// only called when everything else is fine.
func classify(e *protocol.Exec, cpuLimitMS, memoryLimitKB int64, check func() bool) Verdict {
	switch {
	case e.StartError != "":
		return RuntimeError
	case e.OutputExceeded:
		return OutputLimit
	case e.OOMKilled, e.MemoryKB > memoryLimitKB:
		return MemoryLimit
	case e.TimedOut, e.CPUMS > cpuLimitMS, e.Signal == sigXCPU:
		return TimeLimit
	case e.Signal == sigXFSZ:
		return OutputLimit
	case e.Signal != 0, e.ExitCode != 0:
		return RuntimeError
	case !check():
		return WrongAnswer
	}
	return Accepted
}

// describe says how a test failed, for the CLI and logs.
func describe(e *protocol.Exec, v Verdict) string {
	switch v {
	case RuntimeError:
		switch {
		case e.StartError != "":
			return "could not start: " + e.StartError
		case e.Signal != 0:
			return "killed by " + signalName(e.Signal)
		default:
			return fmt.Sprintf("exit code %d", e.ExitCode)
		}
	case TimeLimit:
		if e.TimedOut {
			return "killed at the wall-clock limit"
		}
		return fmt.Sprintf("used %d ms of CPU", e.CPUMS)
	case MemoryLimit:
		if e.OOMKilled {
			return "killed by the OOM killer"
		}
		return fmt.Sprintf("used %.1f MB", float64(e.MemoryKB)/1024)
	case OutputLimit:
		if e.Signal == sigXFSZ {
			return "wrote a file over the size limit"
		}
		return "printed more than 1 MB"
	}
	return ""
}

// overall is the first verdict that is not AC, or AC.
func overall(tests []TestResult) Verdict {
	for _, t := range tests {
		if t.Verdict != Accepted {
			return t.Verdict
		}
	}
	return Accepted
}
