package judge

import (
	"bytes"
	"testing"
)

func TestCheck(t *testing.T) {
	cases := []struct {
		name      string
		expected  string
		actual    string
		tolerance float64
		want      bool
	}{
		{"identical", "3\n", "3\n", 0, true},
		{"missing final newline", "3\n", "3", 0, true},
		{"CRLF line endings", "1 2\n3\n", "1 2\r\n3\r\n", 0, true},
		{"trailing spaces and tabs", "1 2\n3\n", "1 2  \t\n3 \n", 0, true},
		{"trailing blank lines", "3\n", "3\n\n\n \n", 0, true},
		{"different number", "3\n", "4\n", 0, false},
		{"extra line", "3\n", "3\n4\n", 0, false},
		{"missing line", "1\n2\n", "1\n", 0, false},
		{"leading space matters", "3\n", " 3\n", 0, false},
		{"inner spacing matters", "1 2\n", "1  2\n", 0, false},
		{"blank line in the middle matters", "1\n2\n", "1\n\n2\n", 0, false},
		{"empty both", "", "", 0, true},
		{"empty vs blank lines", "", "\n\n", 0, true},
		{"empty vs output", "", "0\n", 0, false},
		{"case matters", "YES\n", "yes\n", 0, false},
		{"no tolerance: float spelling matters", "0.5\n", "0.50\n", 0, false},
		{"tolerance: absolute", "0.5\n", "0.5000004\n", 1e-6, true},
		{"tolerance: relative", "1000000\n", "1000000.5\n", 1e-6, true},
		{"tolerance: too far", "0.5\n", "0.5001\n", 1e-6, false},
		{"tolerance: several numbers", "1.0 2.0\n3\n", "1.0000001 1.9999999\n3\n", 1e-6, true},
		{"tolerance: token count", "1.0 2.0\n", "1.0\n", 1e-6, false},
		{"tolerance: words still exact", "yes 1.0\n", "no 1.0\n", 1e-6, false},
		{"tolerance: exponent", "1e-3\n", "0.001\n", 1e-9, true},
		{"tolerance: nan is not a number", "1\n", "nan\n", 1e-6, false},
		{"tolerance: hex float is not an answer", "1\n", "0x1p0\n", 1e-6, false},
		{"tolerance: inf is not an answer", "1e308\n", "inf\n", 1e-6, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Check([]byte(c.expected), []byte(c.actual), c.tolerance); got != c.want {
				t.Errorf("Check(%q, %q, %g) = %v, want %v", c.expected, c.actual, c.tolerance, got, c.want)
			}
		})
	}
}

func FuzzCheck(f *testing.F) {
	f.Add([]byte("1 2\n3\n"), []byte("1 2 \r\n3\n\n"), 0.0)
	f.Add([]byte("0.5\n"), []byte("0.5000001\n"), 1e-6)
	f.Add([]byte(""), []byte("\n"), 0.0)
	f.Add([]byte("a\rb\r\n"), []byte("a\rb\n"), 1e-9)
	f.Fuzz(func(t *testing.T, expected, actual []byte, tolerance float64) {
		got := Check(expected, actual, tolerance) // must not panic
		if !Check(expected, expected, tolerance) {
			t.Fatalf("Check is not reflexive for %q", expected)
		}
		if exact := Check(expected, actual, 0); exact != Check(actual, expected, 0) {
			t.Fatalf("exact Check is not symmetric for %q and %q", expected, actual)
		}
		if Check(expected, actual, 0) && !got && tolerance >= 0 {
			t.Fatalf("an exact match was rejected with tolerance %g", tolerance)
		}
		// Trailing whitespace and blank lines never change the answer.
		padded := append(bytes.Clone(actual), " \t\n\n"...)
		if Check(expected, actual, 0) != Check(expected, padded, 0) {
			t.Fatalf("trailing whitespace changed the result for %q", actual)
		}
	})
}
