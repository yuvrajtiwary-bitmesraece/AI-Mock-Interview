package problems

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// bank is the real problem bank of the repository.
const bank = "../../problems"

func write(t *testing.T, dir string, files map[string]string) {
	t.Helper()
	for name, content := range files {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func validFiles() map[string]string {
	return map[string]string{
		"problem.yaml":     "title: Echo\ndifficulty: easy\ntags: [io]\ntime_ms: 1000\nmemory_mb: 256\nfloat_tolerance: 1e-6\n",
		"statement.md":     "# Echo\n",
		"samples/1.in":     "1\n",
		"samples/1.out":    "1\n",
		"tests/2.in":       "2\n",
		"tests/2.out":      "2\n",
		"tests/10.in":      "10\n",
		"tests/10.out":     "10\n",
		"starter/main.cpp": "int main() {}\n",
		"starter/main.py":  "print()\n",
	}
}

func TestLoad(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "echo")
	write(t, dir, validFiles())
	p, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	if p.Slug != "echo" || p.Title != "Echo" || p.Difficulty != "easy" || p.TimeMS != 1000 || p.MemoryMB != 256 || p.FloatTolerance != 1e-6 {
		t.Errorf("problem = %+v", p)
	}
	if len(p.Samples) != 1 || p.Samples[0].Kind != Sample {
		t.Errorf("samples = %+v", p.Samples)
	}
	// Numeric order: 2 before 10.
	if len(p.Hidden) != 2 || p.Hidden[0].Name != "2" || p.Hidden[1].Name != "10" || p.Hidden[1].Kind != Hidden {
		t.Errorf("hidden = %+v", p.Hidden)
	}
	if p.Starter["cpp"] == "" || p.Starter["python"] == "" || len(p.Starter) != 2 {
		t.Errorf("starter = %v", p.Starter)
	}
}

func TestLoadRejects(t *testing.T) {
	cases := map[string]func(map[string]string){
		"unknown yaml field": func(f map[string]string) { f["problem.yaml"] += "points: 100\n" },
		"bad difficulty": func(f map[string]string) {
			f["problem.yaml"] = strings.Replace(f["problem.yaml"], "easy", "trivial", 1)
		},
		"time limit too large": func(f map[string]string) { f["problem.yaml"] = strings.Replace(f["problem.yaml"], "1000", "60000", 1) },
		"no title":             func(f map[string]string) { f["problem.yaml"] = strings.Replace(f["problem.yaml"], "Echo", `""`, 1) },
		"empty statement":      func(f map[string]string) { f["statement.md"] = "\n" },
		"no samples":           func(f map[string]string) { delete(f, "samples/1.in"); delete(f, "samples/1.out") },
		"missing .out":         func(f map[string]string) { delete(f, "tests/2.out") },
		"stray file":           func(f map[string]string) { f["tests/notes.txt"] = "hi" },
		"bad test name":        func(f map[string]string) { f["tests/a.in"] = "1"; f["tests/a.out"] = "1" },
		"unknown starter":      func(f map[string]string) { f["starter/main.rb"] = "puts 1" },
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			files := validFiles()
			change(files)
			dir := filepath.Join(t.TempDir(), "echo")
			write(t, dir, files)
			if _, err := Load(dir); err == nil {
				t.Fatal("Load accepted a broken problem")
			}
		})
	}
}

func TestFind(t *testing.T) {
	p, err := Find(bank, "budget-windows")
	if err != nil || p.Slug != "budget-windows" {
		t.Fatalf("Find = %v, %v", p, err)
	}
	for _, slug := range []string{"no-such-problem", "../problems", "Budget-Windows", "", "a/b"} {
		if _, err := Find(bank, slug); !errors.Is(err, ErrNotFound) {
			t.Errorf("Find(%q): err = %v, want ErrNotFound", slug, err)
		}
	}
}

// TestBank checks the rules of the problem bank (spec section 7) on every
// problem in the repository. Python and Java starters and solutions join
// the required languages in Stage C.
func TestBank(t *testing.T) {
	all, err := LoadAll(bank)
	if err != nil {
		t.Fatal(err)
	}
	if len(all) == 0 {
		t.Fatal("the bank is empty")
	}
	required := []string{"cpp"}
	solution := map[string]string{"cpp": "main.cpp"}
	for _, p := range all {
		t.Run(p.Slug, func(t *testing.T) {
			if len(p.Hidden) < 15 {
				t.Errorf("%d hidden tests, want at least 15", len(p.Hidden))
			}
			for _, lang := range required {
				if p.Starter[lang] == "" {
					t.Errorf("no %s starter", lang)
				}
				if _, err := os.Stat(filepath.Join(p.Dir, "solutions", solution[lang])); err != nil {
					t.Errorf("no %s reference solution: %v", lang, err)
				}
			}
			if _, err := os.Stat(filepath.Join(p.Dir, "solutions", "brute.cpp")); err != nil {
				t.Errorf("no brute force: %v", err)
			}
			if _, err := os.Stat(filepath.Join(p.Dir, "gen")); err != nil {
				t.Errorf("no test generator: %v", err)
			}
		})
	}
}
