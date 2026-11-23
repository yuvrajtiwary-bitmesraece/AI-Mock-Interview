// Package sandbox starts the containers that submissions run in.
//
// It drives Docker through the docker CLI, so the same code works with Docker
// Desktop on Windows and macOS and with Docker Engine on Linux, with runc or
// gVisor (runsc) as the runtime.
package sandbox

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// Label marks every sandbox container, so leftovers can be found and removed.
const Label = "verdict=1"

// Defaults shared by every sandbox (spec section 5).
const (
	DefaultPIDs   = 128
	DefaultCPUs   = "1"
	DefaultWorkMB = 64
	DefaultTmpMB  = 16
	DefaultUID    = 10001 // the "verdict" user of the images
)

// Spec describes one sandbox container.
type Spec struct {
	Name     string // container name, unique per run
	Image    string
	Runtime  string // "runc" or "runsc"; empty means Docker's default
	MemoryMB int64  // hard memory limit; swap is disabled
	PIDs     int    // process and thread limit
	CPUs     string // CPU quota, e.g. "1"
	WorkMB   int    // size of /work, the only writable and executable place
	TmpMB    int    // size of /tmp
	UID      int    // user and group the runner runs as; never 0
}

func (s Spec) withDefaults() Spec {
	if s.PIDs == 0 {
		s.PIDs = DefaultPIDs
	}
	if s.CPUs == "" {
		s.CPUs = DefaultCPUs
	}
	if s.WorkMB == 0 {
		s.WorkMB = DefaultWorkMB
	}
	if s.TmpMB == 0 {
		s.TmpMB = DefaultTmpMB
	}
	if s.UID == 0 {
		s.UID = DefaultUID
	}
	return s
}

// Args returns the docker command line that starts spec.
func Args(spec Spec) []string {
	s := spec.withDefaults()
	mem := strconv.FormatInt(s.MemoryMB, 10) + "m"
	id := strconv.Itoa(s.UID)
	args := []string{
		"run", "--rm", "--interactive",
		"--name", s.Name,
		"--label", Label,
		"--pull", "never",
		"--network", "none",
		"--read-only",
		"--tmpfs", fmt.Sprintf("/work:rw,exec,nosuid,nodev,size=%dm,uid=%s,gid=%s,mode=0700", s.WorkMB, id, id),
		"--tmpfs", fmt.Sprintf("/tmp:rw,noexec,nosuid,nodev,size=%dm,mode=1777", s.TmpMB),
		"--user", id + ":" + id,
		"--cap-drop", "ALL",
		"--security-opt", "no-new-privileges",
		"--memory", mem,
		"--memory-swap", mem, // equal to --memory: no swap
		"--pids-limit", strconv.Itoa(s.PIDs),
		"--cpus", s.CPUs,
		"--ipc", "private",
		"--cgroupns", "private",
		"--log-driver", "none", // output is streamed, never stored
	}
	if s.Runtime != "" {
		args = append(args, "--runtime", s.Runtime)
	}
	return append(args, s.Image)
}

// Docker runs sandboxes with the docker CLI.
type Docker struct {
	// Bin is the docker binary; empty means "docker" from PATH.
	Bin string
}

func (d Docker) bin() string {
	if d.Bin != "" {
		return d.Bin
	}
	return "docker"
}

// Run starts a container for spec, copies stdin to the runner and the
// runner's stdout to stdout, and returns once the container has exited. The
// container is removed whatever happens: docker removes it when it exits
// (--rm), and Run removes it by force when ctx ends first, on any error and
// on a panic.
func (d Docker) Run(ctx context.Context, spec Spec, stdin io.Reader, stdout io.Writer) (err error) {
	if spec.Name == "" || spec.Image == "" || spec.MemoryMB <= 0 || spec.UID < 0 {
		return errors.New("sandbox: incomplete spec")
	}
	defer func() {
		if p := recover(); p != nil {
			d.remove(spec.Name)
			panic(p)
		}
		if err != nil {
			d.remove(spec.Name)
		}
	}()

	cmd := exec.CommandContext(ctx, d.bin(), Args(spec)...)
	cmd.Stdin = stdin
	cmd.Stdout = stdout
	stderr := &capped{max: 4 << 10}
	cmd.Stderr = stderr
	cmd.Cancel = func() error {
		d.remove(spec.Name) // kills the container; the CLI then exits
		return cmd.Process.Kill()
	}
	cmd.WaitDelay = 10 * time.Second
	err = cmd.Run()
	if ctx.Err() != nil {
		return fmt.Errorf("sandbox: %w", ctx.Err())
	}
	if err != nil {
		if msg := strings.TrimSpace(stderr.String()); msg != "" {
			return fmt.Errorf("sandbox: %w: %s", err, msg)
		}
		return fmt.Errorf("sandbox: %w", err)
	}
	return nil
}

// remove force-removes a container. It ignores errors: the container may
// already be gone.
func (d Docker) remove(name string) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	_ = exec.CommandContext(ctx, d.bin(), "rm", "--force", name).Run()
}

// Sweep removes sandbox containers created more than olderThan ago: leftovers
// of a worker that crashed. It returns how many it removed.
func (d Docker) Sweep(ctx context.Context, olderThan time.Duration) (int, error) {
	out, err := exec.CommandContext(ctx, d.bin(), "ps", "--all",
		"--filter", "label="+Label, "--format", "{{.ID}}\t{{.CreatedAt}}").Output()
	if err != nil {
		return 0, fmt.Errorf("sandbox: list containers: %w", err)
	}
	ids := stale(string(out), time.Now(), olderThan)
	if len(ids) == 0 {
		return 0, nil
	}
	if err := exec.CommandContext(ctx, d.bin(), append([]string{"rm", "--force"}, ids...)...).Run(); err != nil {
		return 0, fmt.Errorf("sandbox: remove containers: %w", err)
	}
	return len(ids), nil
}

// Count returns how many sandbox containers exist, running or not.
func (d Docker) Count(ctx context.Context) (int, error) {
	out, err := exec.CommandContext(ctx, d.bin(), "ps", "--all", "--quiet", "--filter", "label="+Label).Output()
	if err != nil {
		return 0, fmt.Errorf("sandbox: list containers: %w", err)
	}
	return len(strings.Fields(string(out))), nil
}

// stale parses "ID<TAB>CreatedAt" lines from docker ps and returns the IDs of
// containers created more than age before now. Lines it cannot parse are
// skipped: never remove a container that might still be in use.
func stale(ps string, now time.Time, age time.Duration) []string {
	var ids []string
	for line := range strings.Lines(ps) {
		id, created, ok := strings.Cut(strings.TrimSpace(line), "\t")
		if !ok {
			continue
		}
		t, err := time.Parse("2006-01-02 15:04:05 -0700 MST", strings.TrimSpace(created))
		if err == nil && now.Sub(t) > age {
			ids = append(ids, id)
		}
	}
	return ids
}

// capped is an io.Writer that keeps the first max bytes.
type capped struct {
	buf bytes.Buffer
	max int
}

func (c *capped) Write(p []byte) (int, error) {
	if room := c.max - c.buf.Len(); room > 0 {
		c.buf.Write(p[:min(len(p), room)])
	}
	return len(p), nil
}

func (c *capped) String() string { return c.buf.String() }
