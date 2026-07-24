# Stage 1: Build the Go binary.
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git for module fetching.
RUN apk add --no-cache git ca-certificates

# Copy dependency files first for layer caching.
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source.
COPY . .

# Build a static binary.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w -X main.version=$(git describe --tags --always --dirty 2>/dev/null || echo '0.1.0-dev')" \
    -o /app/zen-server ./cmd/zen-server/

# Stage 2: Minimal runtime image.
FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/zen-server /zen-server

EXPOSE 8080

ENTRYPOINT ["/zen-server"]
