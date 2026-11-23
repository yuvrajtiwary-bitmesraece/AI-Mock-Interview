package judge

import (
	"math"
	"regexp"
	"strconv"
	"strings"
)

// Check reports whether actual is an acceptable answer for expected.
//
// Both outputs are normalized first: "\r\n" becomes "\n", trailing spaces,
// tabs and carriage returns are trimmed from every line, and trailing blank
// lines are dropped. The lines must then match exactly. With a tolerance
// above 0, two lines that differ are compared token by token instead, and two
// numbers match when they differ by at most tolerance, either absolutely or
// relative to the expected number.
func Check(expected, actual []byte, tolerance float64) bool {
	want, got := normalize(expected), normalize(actual)
	if len(want) != len(got) {
		return false
	}
	for i := range want {
		if want[i] == got[i] {
			continue
		}
		if !(tolerance > 0) || !closeEnough(want[i], got[i], tolerance) {
			return false
		}
	}
	return true
}

func normalize(b []byte) []string {
	lines := strings.Split(strings.ReplaceAll(string(b), "\r\n", "\n"), "\n")
	for i, l := range lines {
		lines[i] = strings.TrimRight(l, " \t\r")
	}
	for len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}
	return lines
}

func closeEnough(want, got string, tolerance float64) bool {
	wt, gt := strings.Fields(want), strings.Fields(got)
	if len(wt) != len(gt) {
		return false
	}
	for i := range wt {
		if wt[i] == gt[i] {
			continue
		}
		w, ok1 := number(wt[i])
		g, ok2 := number(gt[i])
		if !ok1 || !ok2 {
			return false
		}
		diff := math.Abs(w - g)
		if !(diff <= tolerance || diff <= tolerance*math.Abs(w)) {
			return false
		}
	}
	return true
}

// decimal is a plain decimal number. Hex floats, "inf", "nan" and digit
// separators, which strconv.ParseFloat would also accept, are not answers.
var decimal = regexp.MustCompile(`^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$`)

func number(s string) (float64, bool) {
	if !decimal.MatchString(s) {
		return 0, false
	}
	f, err := strconv.ParseFloat(s, 64)
	return f, err == nil
}
