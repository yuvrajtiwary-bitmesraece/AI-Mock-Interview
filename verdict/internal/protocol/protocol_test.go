package protocol

import (
	"bytes"
	"errors"
	"io"
	"strings"
	"testing"
)

var key = bytes.Repeat([]byte{7}, KeySize)

func writeAll(t *testing.T, key []byte, reps ...Report) []byte {
	t.Helper()
	var buf bytes.Buffer
	w := NewWriter(&buf, key)
	for _, r := range reps {
		if err := w.Write(r); err != nil {
			t.Fatal(err)
		}
	}
	return buf.Bytes()
}

func TestRoundTrip(t *testing.T) {
	stream := writeAll(t, key,
		Report{Type: TypeCompile, Exec: &Exec{CPUMS: 900}},
		Report{Type: TypeTest, Index: 1, Exec: &Exec{Stdout: []byte("42\n"), MemoryKB: 3000}},
		Report{Type: TypeDone, TestsRun: 1},
	)
	r := NewReader(bytes.NewReader(stream), key)
	var got []Report
	for {
		rep, err := r.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		got = append(got, rep)
	}
	if len(got) != 3 {
		t.Fatalf("got %d reports, want 3", len(got))
	}
	if got[1].Index != 1 || string(got[1].Exec.Stdout) != "42\n" || got[1].Seq != 1 {
		t.Errorf("test report = %+v", got[1])
	}
	if got[2].Type != TypeDone || got[2].TestsRun != 1 {
		t.Errorf("done report = %+v", got[2])
	}
}

func TestReaderRejects(t *testing.T) {
	good := writeAll(t, key, Report{Type: TypeTest, Index: 1, Exec: &Exec{}})
	lines := writeAll(t, key, Report{Type: TypeTest, Index: 1, Exec: &Exec{}}, Report{Type: TypeDone, TestsRun: 1})
	second := lines[bytes.IndexByte(lines, '\n')+1:]

	tests := map[string][]byte{
		"wrong key":       writeAll(t, bytes.Repeat([]byte{8}, KeySize), Report{Type: TypeDone}),
		"tampered json":   bytes.Replace(good, []byte(`"index":1`), []byte(`"index":2`), 1),
		"unsigned line":   []byte(`{"seq":0,"type":"done"}` + "\n"),
		"forged AC line":  []byte("AC 20/20\n"),
		"bad hex":         append(bytes.Repeat([]byte{'z'}, 64), []byte(` {"seq":0,"type":"done"}`+"\n")...),
		"skipped report":  second,
		"replayed report": append(append([]byte{}, good...), good...),
	}
	for name, stream := range tests {
		t.Run(name, func(t *testing.T) {
			r := NewReader(bytes.NewReader(stream), key)
			var err error
			for err == nil {
				_, err = r.Next()
			}
			if !errors.Is(err, ErrBadReport) {
				t.Fatalf("err = %v, want ErrBadReport", err)
			}
		})
	}
}

func TestReaderRejectsHugeLine(t *testing.T) {
	stream := strings.Repeat("a", MaxReportLine+10) + "\n"
	_, err := NewReader(strings.NewReader(stream), key).Next()
	if !errors.Is(err, ErrBadReport) {
		t.Fatalf("err = %v, want ErrBadReport", err)
	}
}

func TestSucceeded(t *testing.T) {
	cases := []struct {
		e    Exec
		want bool
	}{
		{Exec{}, true},
		{Exec{ExitCode: 1}, false},
		{Exec{Signal: 9}, false},
		{Exec{TimedOut: true}, false},
		{Exec{OOMKilled: true}, false},
		{Exec{StartError: "no such file"}, false},
	}
	for _, c := range cases {
		if got := c.e.Succeeded(); got != c.want {
			t.Errorf("%+v.Succeeded() = %v, want %v", c.e, got, c.want)
		}
	}
}
