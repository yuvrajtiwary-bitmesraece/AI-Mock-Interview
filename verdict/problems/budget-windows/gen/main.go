// Command gen writes the sample and hidden tests of budget-windows. Run it
// from the verdict directory:
//
//	go run ./problems/budget-windows/gen
//
// It is deterministic: CI runs it and fails if the committed tests differ.
package main

import (
	"bytes"
	"flag"
	"fmt"
	"log"
	"math/rand/v2"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	maxN = 200_000
	maxA = 1_000
	maxK = 1_000_000_000
)

type testCase struct {
	k int64
	a []int64
}

func main() {
	dir := flag.String("dir", filepath.Join("problems", "budget-windows"), "problem directory")
	flag.Parse()
	write(filepath.Join(*dir, "samples"), []testCase{
		{k: 3, a: []int64{1, 2, -1, 3, 0}},
		{k: 0, a: []int64{0, 0, 0, 0}},
		{k: -2, a: []int64{-1, -1, -1}},
	})
	write(filepath.Join(*dir, "tests"), hidden())
}

func hidden() []testCase {
	r := rand.New(rand.NewPCG(2026, 11))
	random := func(n int, lo, hi int64) []int64 {
		a := make([]int64, n)
		for i := range a {
			a[i] = lo + r.Int64N(hi-lo+1)
		}
		return a
	}
	constant := func(n int, v int64) []int64 {
		a := make([]int64, n)
		for i := range a {
			a[i] = v
		}
		return a
	}
	alternating := func(n int, v int64) []int64 {
		a := constant(n, v)
		for i := 1; i < n; i += 2 {
			a[i] = -v
		}
		return a
	}
	sum := func(a []int64) (s int64) {
		for _, x := range a {
			s += x
		}
		return s
	}
	nonNegative := random(20_000, 0, maxA)
	return []testCase{
		{k: 7, a: []int64{7}},                                        // a single day that is a window
		{k: 5, a: []int64{-5}},                                       // a single day that is not
		{k: 0, a: []int64{maxA, -maxA}},                              // the extreme values of a_i
		{k: 2, a: random(10, -3, 3)},                                 // small, mixed signs
		{k: -4, a: random(8, 1, 5)},                                  // negative k, positive days: none
		{k: 0, a: alternating(1_000, 1)},                             // many windows summing to 0
		{k: 0, a: constant(1_000, 0)},                                // every window sums to 0
		{k: r.Int64N(21) - 10, a: random(1_000, -5, 5)},              // dense small values
		{k: 0, a: random(5_000, -maxA, maxA)},                        // medium, k = 0
		{k: r.Int64N(6_001) - 3_000, a: random(20_000, -maxA, maxA)}, // medium, random k
		{k: maxA * 137, a: constant(20_000, maxA)},                   // exactly the windows of 137 days
		{k: -maxK, a: random(20_000, -maxA, maxA)},                   // k out of reach
		{k: sum(nonNegative), a: nonNegative},                        // only windows covering (nearly) everything
		{k: 0, a: alternating(50_000, maxA)},                         // large, extreme alternating values
		{k: 0, a: constant(maxN, 0)},                                 // max size: 20000100000 needs 64 bits
		{k: r.Int64N(4_001) - 2_000, a: random(maxN, -maxA, maxA)},   // max size, random
		{k: 0, a: random(maxN, -2, 2)},                               // max size, very many windows
	}
}

// solve counts windows with prefix sums and a map, in O(n).
func solve(c testCase) int64 {
	seen := map[int64]int64{0: 1}
	var prefix, windows int64
	for _, x := range c.a {
		prefix += x
		windows += seen[prefix-c.k]
		seen[prefix]++
	}
	return windows
}

func write(dir string, cases []testCase) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Fatal(err)
	}
	old, _ := filepath.Glob(filepath.Join(dir, "*.*"))
	for _, f := range old {
		if strings.HasSuffix(f, ".in") || strings.HasSuffix(f, ".out") {
			_ = os.Remove(f)
		}
	}
	for i, c := range cases {
		if n := len(c.a); n < 1 || n > maxN || c.k < -maxK || c.k > maxK {
			log.Fatalf("%s test %d breaks the constraints", dir, i+1)
		}
		var in bytes.Buffer
		fmt.Fprintf(&in, "%d %d\n", len(c.a), c.k)
		for j, x := range c.a {
			if x < -maxA || x > maxA {
				log.Fatalf("%s test %d: a_%d = %d is out of range", dir, i+1, j+1, x)
			}
			if j > 0 {
				in.WriteByte(' ')
			}
			in.WriteString(strconv.FormatInt(x, 10))
		}
		in.WriteByte('\n')
		name := filepath.Join(dir, strconv.Itoa(i+1))
		if err := os.WriteFile(name+".in", in.Bytes(), 0o644); err != nil {
			log.Fatal(err)
		}
		if err := os.WriteFile(name+".out", []byte(strconv.FormatInt(solve(c), 10)+"\n"), 0o644); err != nil {
			log.Fatal(err)
		}
	}
}
