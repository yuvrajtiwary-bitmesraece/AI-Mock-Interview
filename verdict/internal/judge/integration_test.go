//go:build integration

package judge

// The integration tests judge real C++ programs in real sandboxes. They need
// Docker and the images (see images/):
//
//	docker build -f images/cpp/Dockerfile -t verdict-cpp:dev .
//	go test -tags integration -count=1 ./internal/judge/
//
// SANDBOX_RUNTIME selects runc or runsc; VERDICT_IMAGE_TAG the image tag.

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/problems"
	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/sandbox"
)

func TestIntegrationCpp(t *testing.T) {
	docker := sandbox.Docker{}
	ctx := context.Background()
	if _, err := docker.Count(ctx); err != nil {
		t.Fatalf("Docker is not available: %v", err)
	}
	tag := os.Getenv("VERDICT_IMAGE_TAG")
	if tag == "" {
		tag = "dev"
	}
	p, err := problems.Find(filepath.Join("..", "..", "problems"), "budget-windows")
	if err != nil {
		t.Fatal(err)
	}
	j := &Judge{
		Sandbox:   docker,
		Languages: Languages(tag),
		Runtime:   os.Getenv("SANDBOX_RUNTIME"),
		Log:       slog.New(slog.DiscardHandler),
	}

	// Integer division by zero traps on x86-64 only; arm64 returns 0.
	divZero := RuntimeError
	if runtime.GOARCH == "arm64" {
		divZero = WrongAnswer
	}
	solutions := filepath.Join(p.Dir, "solutions")
	fixtures := filepath.Join("testdata", "cpp")
	cases := []struct {
		name string
		file string
		mode Mode
		want Verdict
	}{
		{"reference solution", filepath.Join(solutions, "main.cpp"), Submit, Accepted},
		{"brute force", filepath.Join(solutions, "brute.cpp"), Submit, TimeLimit},
		{"wrong answer", filepath.Join(fixtures, "wa.cpp"), Run, WrongAnswer},
		{"int overflow passes the samples", filepath.Join(fixtures, "overflow.cpp"), Run, Accepted},
		{"int overflow fails a hidden test", filepath.Join(fixtures, "overflow.cpp"), Submit, WrongAnswer},
		{"infinite loop", filepath.Join(fixtures, "loop.cpp"), Run, TimeLimit},
		{"null pointer", filepath.Join(fixtures, "segfault.cpp"), Run, RuntimeError},
		{"division by zero", filepath.Join(fixtures, "div0.cpp"), Run, divZero},
		{"uncaught exception", filepath.Join(fixtures, "throw.cpp"), Run, RuntimeError},
		{"non-zero exit status", filepath.Join(fixtures, "exit3.cpp"), Run, RuntimeError},
		{"syntax error", filepath.Join(fixtures, "syntax.cpp"), Run, CompileError},
		{"prints forever", filepath.Join(fixtures, "flood.cpp"), Run, OutputLimit},
	}

	// A few sandboxes at a time: enough to be quick, few enough for a
	// 4 GB Docker Desktop VM or a 2-core CI runner.
	slots := make(chan struct{}, 3)
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()
			slots <- struct{}{}
			defer func() { <-slots }()

			src, err := os.ReadFile(c.file)
			if err != nil {
				t.Fatal(err)
			}
			res, err := j.Judge(ctx, Submission{ID: "it", Problem: p, Language: "cpp", Source: src, Mode: c.mode})
			if err != nil {
				t.Fatal(err)
			}
			if res.Verdict != c.want {
				t.Fatalf("verdict %s, want %s\ninternal: %s\ncompile output: %s\ntests: %+v",
					res.Verdict, c.want, res.Internal, res.CompileOutput, res.Tests)
			}
			wantTotal := len(p.Samples)
			if c.mode == Submit {
				wantTotal += len(p.Hidden)
			}
			if res.Total != wantTotal {
				t.Errorf("total = %d, want %d", res.Total, wantTotal)
			}
			for _, tr := range res.Tests {
				if tr.Kind == "hidden" && (tr.Input != nil || tr.Expected != nil || tr.Actual != nil) {
					t.Errorf("hidden test %d reveals its data", tr.Index)
				}
			}
			switch c.want {
			case Accepted:
				if res.Passed != res.Total || len(res.Tests) != res.Total {
					t.Errorf("passed %d of %d, with %d results", res.Passed, res.Total, len(res.Tests))
				}
			case CompileError:
				if !strings.Contains(res.CompileOutput, "error") || len(res.Tests) != 0 {
					t.Errorf("compile output %q, %d test results", res.CompileOutput, len(res.Tests))
				}
			case WrongAnswer:
				if c.mode == Run && (res.Tests[0].Actual == nil || res.Tests[0].Expected == nil) {
					t.Errorf("a failed sample must show expected and actual output")
				}
			}
		})
	}

	// Runs after every parallel subtest has finished.
	t.Cleanup(func() {
		if n, err := docker.Count(ctx); err != nil || n != 0 {
			t.Errorf("%d sandbox containers left behind (err %v)", n, err)
		}
	})
}
