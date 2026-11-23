// Package problems loads the problem bank from disk.
//
// Each problem is a directory named after its slug:
//
//	problem.yaml       title, difficulty, tags, time_ms, memory_mb, float_tolerance (optional)
//	statement.md
//	samples/{n}.in, {n}.out
//	tests/{n}.in, {n}.out      hidden
//	starter/main.cpp, main.py, Main.java
//	solutions/, gen/           reference solutions and the test generator (not loaded)
package problems

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"go.yaml.in/yaml/v3"
)

// Kinds of test.
const (
	Sample = "sample"
	Hidden = "hidden"
)

// Difficulties, easiest first.
var Difficulties = []string{"easy", "medium", "hard"}

// Problem is one problem of the bank. Test data stays on disk.
type Problem struct {
	Slug           string
	Title          string
	Difficulty     string
	Tags           []string
	TimeMS         int64   // CPU time per test, before the language's factor
	MemoryMB       int64   // memory per test
	FloatTolerance float64 // 0 means outputs must match exactly
	Statement      string  // Markdown
	Samples        []Test
	Hidden         []Test
	Starter        map[string]string // language ID -> starter code
	Dir            string
}

// Test is one test case on disk.
type Test struct {
	Kind   string // Sample or Hidden
	Name   string // "3" for 3.in and 3.out
	Input  string // path of the .in file
	Output string // path of the .out file
}

// starterFiles maps starter file names to language IDs.
var starterFiles = map[string]string{
	"main.cpp":  "cpp",
	"main.py":   "python",
	"Main.java": "java",
}

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// ValidSlug reports whether s can name a problem.
func ValidSlug(s string) bool {
	return len(s) <= 64 && slugPattern.MatchString(s)
}

// ErrNotFound means there is no problem with the requested slug.
var ErrNotFound = errors.New("problem not found")

type meta struct {
	Title          string   `yaml:"title"`
	Difficulty     string   `yaml:"difficulty"`
	Tags           []string `yaml:"tags"`
	TimeMS         int64    `yaml:"time_ms"`
	MemoryMB       int64    `yaml:"memory_mb"`
	FloatTolerance float64  `yaml:"float_tolerance"`
}

// Find loads the problem with the given slug from the bank in root.
func Find(root, slug string) (*Problem, error) {
	if !ValidSlug(slug) {
		return nil, fmt.Errorf("%w: %q", ErrNotFound, slug)
	}
	dir := filepath.Join(root, slug)
	if _, err := os.Stat(filepath.Join(dir, "problem.yaml")); errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("%w: %q", ErrNotFound, slug)
	}
	return Load(dir)
}

// LoadAll loads every problem in root, sorted by slug.
func LoadAll(root string) ([]*Problem, error) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, err
	}
	var all []*Problem
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		p, err := Load(filepath.Join(root, e.Name()))
		if err != nil {
			return nil, err
		}
		all = append(all, p)
	}
	return all, nil
}

// Load loads the problem in dir. The directory's name is the slug.
func Load(dir string) (*Problem, error) {
	slug := filepath.Base(dir)
	fail := func(format string, a ...any) (*Problem, error) {
		return nil, fmt.Errorf("problem %s: %s", slug, fmt.Sprintf(format, a...))
	}
	if !ValidSlug(slug) {
		return fail("directory name is not a valid slug")
	}
	f, err := os.Open(filepath.Join(dir, "problem.yaml"))
	if err != nil {
		return fail("%v", err)
	}
	defer f.Close()
	dec := yaml.NewDecoder(f)
	dec.KnownFields(true)
	var m meta
	if err := dec.Decode(&m); err != nil {
		return fail("problem.yaml: %v", err)
	}
	switch {
	case strings.TrimSpace(m.Title) == "":
		return fail("problem.yaml: title is empty")
	case !slices.Contains(Difficulties, m.Difficulty):
		return fail("problem.yaml: difficulty %q is not one of %v", m.Difficulty, Difficulties)
	case m.TimeMS < 100 || m.TimeMS > 10_000:
		return fail("problem.yaml: time_ms %d is outside 100..10000", m.TimeMS)
	case m.MemoryMB < 16 || m.MemoryMB > 1024:
		return fail("problem.yaml: memory_mb %d is outside 16..1024", m.MemoryMB)
	case m.FloatTolerance < 0 || m.FloatTolerance >= 1:
		return fail("problem.yaml: float_tolerance %g is outside [0, 1)", m.FloatTolerance)
	}

	statement, err := os.ReadFile(filepath.Join(dir, "statement.md"))
	if err != nil {
		return fail("%v", err)
	}
	if strings.TrimSpace(string(statement)) == "" {
		return fail("statement.md is empty")
	}
	samples, err := listTests(filepath.Join(dir, "samples"), Sample)
	if err != nil {
		return fail("%v", err)
	}
	if len(samples) == 0 {
		return fail("no sample tests")
	}
	hidden, err := listTests(filepath.Join(dir, "tests"), Hidden)
	if err != nil {
		return fail("%v", err)
	}
	starter, err := loadStarter(filepath.Join(dir, "starter"))
	if err != nil {
		return fail("%v", err)
	}
	return &Problem{
		Slug:           slug,
		Title:          strings.TrimSpace(m.Title),
		Difficulty:     m.Difficulty,
		Tags:           m.Tags,
		TimeMS:         m.TimeMS,
		MemoryMB:       m.MemoryMB,
		FloatTolerance: m.FloatTolerance,
		Statement:      string(statement),
		Samples:        samples,
		Hidden:         hidden,
		Starter:        starter,
		Dir:            dir,
	}, nil
}

// listTests returns the {n}.in/{n}.out pairs in dir, in numeric order. A
// missing directory means no tests.
func listTests(dir, kind string) ([]Test, error) {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	type pair struct{ in, out bool }
	found := map[int]*pair{}
	for _, e := range entries {
		name := e.Name()
		ext := filepath.Ext(name)
		n, err := strconv.Atoi(strings.TrimSuffix(name, ext))
		if e.IsDir() || (ext != ".in" && ext != ".out") || err != nil || n < 1 {
			return nil, fmt.Errorf("%s: unexpected file %s (want {n}.in and {n}.out)", filepath.Base(dir), name)
		}
		p := found[n]
		if p == nil {
			p = &pair{}
			found[n] = p
		}
		if ext == ".in" {
			p.in = true
		} else {
			p.out = true
		}
	}
	nums := make([]int, 0, len(found))
	for n, p := range found {
		if !p.in || !p.out {
			return nil, fmt.Errorf("%s: test %d needs both %[2]d.in and %[2]d.out", filepath.Base(dir), n)
		}
		nums = append(nums, n)
	}
	slices.Sort(nums)
	tests := make([]Test, len(nums))
	for i, n := range nums {
		name := strconv.Itoa(n)
		tests[i] = Test{
			Kind:   kind,
			Name:   name,
			Input:  filepath.Join(dir, name+".in"),
			Output: filepath.Join(dir, name+".out"),
		}
	}
	return tests, nil
}

func loadStarter(dir string) (map[string]string, error) {
	starter := map[string]string{}
	entries, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return starter, nil
	}
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		lang, ok := starterFiles[e.Name()]
		if !ok {
			return nil, fmt.Errorf("starter: unexpected file %s", e.Name())
		}
		b, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			return nil, err
		}
		starter[lang] = string(b)
	}
	return starter, nil
}
