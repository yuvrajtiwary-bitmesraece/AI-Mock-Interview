package judge

// Language is how one language is compiled and run.
type Language struct {
	ID         string   // "cpp"
	Name       string   // "C++17"
	Image      string   // sandbox image with the toolchain and the runner
	SourceName string   // file the source is saved as, in the work directory
	Compile    []string // compile command; nil if the language has none
	Run        []string // command that runs the program
	// TimeFactor multiplies the problem's CPU-time limit.
	TimeFactor float64
	// HeadroomMB is added to the problem's memory limit to size the
	// container: room for the compiler and the language runtime.
	HeadroomMB int64
}

// Languages returns the built-in languages, using sandbox images with the
// given tag ("dev" for images built locally).
func Languages(tag string) map[string]Language {
	return map[string]Language{
		"cpp": {
			ID:         "cpp",
			Name:       "C++17",
			Image:      "verdict-cpp:" + tag,
			SourceName: "main.cpp",
			// The image precompiles <bits/stdc++.h> with these exact flags;
			// change them together (images/cpp/Dockerfile).
			Compile:    []string{"g++", "-std=gnu++17", "-O2", "-pipe", "-o", "main", "main.cpp"},
			Run:        []string{"./main"},
			TimeFactor: 1,
			HeadroomMB: 128, // room for g++, which peaks near 200 MB on heavy sources
		},
	}
}
