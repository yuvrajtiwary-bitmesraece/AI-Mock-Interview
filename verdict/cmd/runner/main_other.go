//go:build !linux

// Command runner only runs on Linux, inside a sandbox image (see images/).
package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Fprintln(os.Stderr, "runner: only runs on Linux, inside a sandbox image (see images/)")
	os.Exit(1)
}
