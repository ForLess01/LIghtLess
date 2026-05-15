# ── Stage 1: Build Go binary ──
FROM golang:1.22-alpine AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /bin/lightless ./cmd/server

# ── Stage 2: Runtime ──
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

# Go binary
COPY --from=builder /bin/lightless /usr/local/bin/lightless

# Data directory for SQLite
RUN mkdir -p /data

EXPOSE 8080

CMD ["lightless"]