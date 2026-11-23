# syntax=docker/dockerfile:1
#
# Sandbox image for C++17: g++ and the Verdict runner as PID 1.
# Build it from the verdict directory:
#
#   docker build -f images/cpp/Dockerfile -t verdict-cpp:dev .

# The runner is a static Go binary, cross-compiled on the build machine for
# the image's platform.
FROM --platform=$BUILDPLATFORM golang:1.27.4-trixie AS runner
ARG TARGETOS TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o /out/verdict-runner ./cmd/runner

FROM debian:trixie-slim
RUN apt-get update \
 && apt-get install --yes --no-install-recommends g++ \
 && rm -rf /var/lib/apt/lists/*
# Precompile <bits/stdc++.h>, which most interview solutions include: it cuts
# compile times by 2-3x. g++ only uses the .gch when the flags match the
# compile command in internal/judge/language.go exactly, and silently falls
# back to the plain header otherwise.
RUN header="$(echo '#include <bits/stdc++.h>' | g++ -std=gnu++17 -O2 -x c++ -E -H - 2>&1 >/dev/null | head -n 1 | cut -d ' ' -f 2)" \
 && g++ -std=gnu++17 -O2 -pipe -x c++-header "$header" -o "$header.gch"
# The sandbox runs as this user: the same uid/gid as sandbox.DefaultUID.
RUN groupadd --gid 10001 verdict \
 && useradd --uid 10001 --gid 10001 --no-create-home --home-dir /work --shell /usr/sbin/nologin verdict
COPY --from=runner /out/verdict-runner /usr/local/bin/verdict-runner
USER 10001:10001
WORKDIR /work
ENTRYPOINT ["/usr/local/bin/verdict-runner"]
