// Command verdictctl is the development CLI for Verdict. It judges a source
// file on this machine, exactly as the worker does, with Docker:
//
//	verdictctl submit -problem budget-windows -mode submit solution.cpp
//	verdictctl problems
//	verdictctl sweep
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/judge"
	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/problems"
	"github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/verdict/internal/sandbox"
)

const usage = `verdictctl judges code locally, in the same sandbox the worker uses.

Usage:
  verdictctl submit -problem SLUG [flags] FILE   judge FILE against a problem
  verdictctl problems [flags]                    list the problem bank
  verdictctl sweep [flags]                       remove leftover sandbox containers

Run "verdictctl COMMAND -h" for the flags of a command.

Exit status: 0 if the verdict is the expected one (AC unless -expect says
otherwise), 1 if it is not, 2 if the file could not be judged.
`

func main() {
	os.Exit(run(os.Args[1:], os.Stdout, os.Stderr))
}

func run(args []string, stdout, stderr io.Writer) int {
	if len(args) == 0 {
		fmt.Fprint(stderr, usage)
		return 2
	}
	switch args[0] {
	case "submit":
		return submit(args[1:], stdout, stderr)
	case "problems":
		return listProblems(args[1:], stdout, stderr)
	case "sweep":
		return sweep(args[1:], stdout, stderr)
	case "help", "-h", "-help", "--help":
		fmt.Fprint(stdout, usage)
		return 0
	}
	fmt.Fprintf(stderr, "verdictctl: unknown command %q\n\n%s", args[0], usage)
	return 2
}

func envOr(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

func submit(args []string, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("submit", flag.ContinueOnError)
	fs.SetOutput(stderr)
	slug := fs.String("problem", "", "problem slug (required)")
	lang := fs.String("lang", "cpp", "language: cpp")
	mode := fs.String("mode", "run", `"run" (sample tests) or "submit" (sample and hidden tests)`)
	dir := fs.String("problems", envOr("PROBLEMS_DIR", "problems"), "problem bank directory ($PROBLEMS_DIR)")
	runtime := fs.String("runtime", envOr("SANDBOX_RUNTIME", "runc"), "sandbox runtime: runc or runsc ($SANDBOX_RUNTIME)")
	tag := fs.String("image-tag", "dev", "tag of the sandbox images")
	asJSON := fs.Bool("json", false, "print the result as JSON")
	expect := fs.String("expect", "AC", "the verdict that makes verdictctl exit with status 0")
	fs.Usage = func() {
		fmt.Fprintln(stderr, "Usage: verdictctl submit -problem SLUG [flags] FILE")
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if *slug == "" || fs.NArg() != 1 {
		fs.Usage()
		return 2
	}
	src, err := os.ReadFile(fs.Arg(0))
	if err != nil {
		fmt.Fprintln(stderr, "verdictctl:", err)
		return 2
	}
	p, err := problems.Find(*dir, *slug)
	if err != nil {
		fmt.Fprintln(stderr, "verdictctl:", err)
		return 2
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	docker := sandbox.Docker{}
	// Like the worker on startup, clear sandboxes that a killed run left behind.
	if _, err := docker.Sweep(ctx, 5*time.Minute); err != nil {
		fmt.Fprintln(stderr, "verdictctl:", err)
		return 2
	}
	j := &judge.Judge{
		Sandbox:   docker,
		Languages: judge.Languages(*tag),
		Runtime:   *runtime,
		Log:       slog.New(slog.NewTextHandler(stderr, &slog.HandlerOptions{Level: slog.LevelWarn})),
	}
	start := time.Now()
	res, err := j.Judge(ctx, judge.Submission{
		ID:       "cli-" + randomID(),
		Problem:  p,
		Language: *lang,
		Source:   src,
		Mode:     judge.Mode(*mode),
	})
	if err != nil {
		fmt.Fprintln(stderr, "verdictctl:", err)
		return 2
	}
	if *asJSON {
		enc := json.NewEncoder(stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(res)
	} else {
		printResult(stdout, p, j.Languages[*lang], *mode, res, time.Since(start))
	}
	if res.Verdict == judge.InternalError {
		return 2
	}
	if string(res.Verdict) == strings.ToUpper(*expect) {
		return 0
	}
	return 1
}

func printResult(w io.Writer, p *problems.Problem, lang judge.Language, mode string, res *judge.Result, took time.Duration) {
	fmt.Fprintf(w, "%s | %s | %s\n\n", p.Title, lang.Name, mode)
	if res.CompileMS > 0 {
		fmt.Fprintf(w, "Compiled in %.1f s\n\n", float64(res.CompileMS)/1000)
	}
	if res.Verdict == judge.CompileError {
		fmt.Fprintf(w, "Compilation failed:\n\n%s\n\n", indent(res.CompileOutput))
	}
	if res.Verdict == judge.InternalError {
		fmt.Fprintf(w, "Internal error (not your code's fault): %s\n\n", res.Internal)
	}
	if len(res.Tests) > 0 {
		tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
		fmt.Fprintln(tw, "  #\tKIND\tVERDICT\tCPU\tWALL\tMEMORY\t")
		for _, t := range res.Tests {
			fmt.Fprintf(tw, "  %d\t%s\t%s\t%d ms\t%d ms\t%.1f MB\t%s\n",
				t.Index, t.Kind, t.Verdict, t.CPUMS, t.WallMS, float64(t.MemoryKB)/1024, t.Detail)
		}
		tw.Flush()
		fmt.Fprintln(w)
	}
	for _, t := range res.Tests {
		if t.Kind != problems.Sample || t.Verdict == judge.Accepted {
			continue
		}
		fmt.Fprintf(w, "Sample test %d: %s\n", t.Index, t.Verdict.Name())
		for _, part := range []struct {
			name string
			text *string
		}{{"input", t.Input}, {"expected", t.Expected}, {"actual", t.Actual}} {
			if part.text != nil {
				fmt.Fprintf(w, "  %s:\n%s\n", part.name, indent(*part.text))
			}
		}
		fmt.Fprintln(w)
	}
	fmt.Fprintf(w, "Verdict: %s (%s), %d/%d tests passed, %.1f s\n",
		res.Verdict, res.Verdict.Name(), res.Passed, res.Total, took.Seconds())
}

func indent(s string) string {
	s = strings.TrimRight(s, "\n")
	if s == "" {
		return "    (empty)"
	}
	return "    " + strings.ReplaceAll(s, "\n", "\n    ")
}

func listProblems(args []string, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("problems", flag.ContinueOnError)
	fs.SetOutput(stderr)
	dir := fs.String("problems", envOr("PROBLEMS_DIR", "problems"), "problem bank directory ($PROBLEMS_DIR)")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	all, err := problems.LoadAll(*dir)
	if err != nil {
		fmt.Fprintln(stderr, "verdictctl:", err)
		return 2
	}
	tw := tabwriter.NewWriter(stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "SLUG\tDIFFICULTY\tTITLE\tTESTS\tLIMITS\tTAGS")
	for _, p := range all {
		fmt.Fprintf(tw, "%s\t%s\t%s\t%d + %d hidden\t%d ms, %d MB\t%s\n", p.Slug, p.Difficulty, p.Title,
			len(p.Samples), len(p.Hidden), p.TimeMS, p.MemoryMB, strings.Join(p.Tags, ", "))
	}
	tw.Flush()
	return 0
}

func sweep(args []string, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("sweep", flag.ContinueOnError)
	fs.SetOutput(stderr)
	age := fs.Duration("older-than", 5*time.Minute, "only remove containers older than this")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	n, err := sandbox.Docker{}.Sweep(context.Background(), *age)
	if err != nil {
		fmt.Fprintln(stderr, "verdictctl:", err)
		return 2
	}
	fmt.Fprintf(stdout, "removed %d sandbox container(s)\n", n)
	return 0
}

func randomID() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		panic(errors.New("no randomness"))
	}
	return hex.EncodeToString(b)
}
