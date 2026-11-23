package sandbox

import (
	"slices"
	"strings"
	"testing"
	"time"
)

func TestArgs(t *testing.T) {
	args := Args(Spec{Name: "verdict-x", Image: "verdict-cpp:dev", Runtime: "runsc", MemoryMB: 448})
	line := strings.Join(args, " ")
	// Every sandbox guarantee from spec section 5 that the container enforces.
	for _, want := range []string{
		"run --rm --interactive",
		"--label verdict=1",
		"--pull never",
		"--network none",
		"--read-only",
		"--tmpfs /work:rw,exec,nosuid,nodev,size=64m,uid=10001,gid=10001,mode=0700",
		"--tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777",
		"--user 10001:10001",
		"--cap-drop ALL",
		"--security-opt no-new-privileges",
		"--memory 448m --memory-swap 448m",
		"--pids-limit 128",
		"--cpus 1",
		"--log-driver none",
		"--runtime runsc",
	} {
		if !strings.Contains(line, want) {
			t.Errorf("docker args lack %q:\n%s", want, line)
		}
	}
	if args[len(args)-1] != "verdict-cpp:dev" {
		t.Errorf("the image must come last: %v", args)
	}
	// Nothing from the host goes in: no mounts, no environment.
	for _, banned := range []string{"-v", "--volume", "--mount", "-e", "--env", "--env-file", "--privileged"} {
		if slices.Contains(args, banned) {
			t.Errorf("docker args contain %s", banned)
		}
	}
	if def := Args(Spec{Name: "n", Image: "i", MemoryMB: 1}); slices.Contains(def, "--runtime") {
		t.Errorf("no runtime given, but --runtime is set: %v", def)
	}
}

func TestStale(t *testing.T) {
	now := time.Date(2026, 11, 23, 12, 0, 0, 0, time.UTC)
	ps := strings.Join([]string{
		"aaa\t2026-11-23 11:50:00 +0000 UTC", // 10 minutes old
		"bbb\t2026-11-23 17:28:00 +0530 IST", // 2 minutes old, other zone
		"ccc\t2026-11-23 16:00:00 +0530 IST", // 1.5 hours old
		"ddd\tyesterday",                     // unparseable: keep
		"",
	}, "\n")
	got := stale(ps, now, 5*time.Minute)
	if want := []string{"aaa", "ccc"}; !slices.Equal(got, want) {
		t.Errorf("stale = %v, want %v", got, want)
	}
}

func TestCapped(t *testing.T) {
	c := &capped{max: 5}
	n, _ := c.Write([]byte("hello world"))
	_, _ = c.Write([]byte("more"))
	if n != 11 || c.String() != "hello" {
		t.Errorf("capped = %q after writing %d bytes", c.String(), n)
	}
}
