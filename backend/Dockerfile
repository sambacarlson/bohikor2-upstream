# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files first for better caching
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /bohikor2 cmd/server/main.go

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy timezone data for Africa/Douala
ENV TZ=Africa/Douala

# Copy the binary from builder
COPY --from=builder /bohikor2 .

# Expose port
EXPOSE 8080

# Run the binary
ENTRYPOINT ["/app/bohikor2"]
