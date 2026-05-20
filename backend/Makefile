.PHONY: run build docker-build lint test generate migrate-up migrate-down migrate-create clean

# Variables
BINARY_NAME=bohikor2
GO_FILES=$(shell find . -name '*.go' -not -path './db/sqlc/*')
MIGRATIONS_DIR=migrations


# Run the dev server
run:
	go run cmd/server/main.go

# Build the binary
build:
	go build -o bin/$(BINARY_NAME) cmd/server/main.go

# Build Docker image
docker-build:
	docker build -t $(BINARY_NAME):latest .

# Run linter
lint:
	golangci-lint run

# Run tests
test:
	go test -v -race -coverprofile=coverage.out ./...

# Generate sqlc code
generate:
	cd db && sqlc generate

# Run migrations up
migrate-up:
	@DATABASE_URL=$$(grep '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2-); \
	if [ -z "$$DATABASE_URL" ]; then \
		echo "ERROR: DATABASE_URL is required"; \
		exit 1; \
	fi; \
	migrate -path $(MIGRATIONS_DIR) -database "$$DATABASE_URL" up

# Run migrations down (rollback last migration)
migrate-down:
	@DATABASE_URL=$$(grep '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2-); \
	if [ -z "$$DATABASE_URL" ]; then \
		echo "ERROR: DATABASE_URL is required"; \
		exit 1; \
	fi; \
	migrate -path $(MIGRATIONS_DIR) -database "$$DATABASE_URL" down 1

# Run migrations with force (to a specific version)
migrate-force:
	@DATABASE_URL=$$(grep '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2-); \
	if [ -z "$$DATABASE_URL" ]; then \
		echo "ERROR: DATABASE_URL is required"; \
		exit 1; \
	fi; \
	if [ -z "$(VERSION)" ]; then \
		echo "ERROR: VERSION is required (e.g. make migrate-force VERSION=1)"; \
		exit 1; \
	fi; \
	migrate -path $(MIGRATIONS_DIR) -database "$$DATABASE_URL" force $(VERSION)

# Create a new migration file
migrate-create:
	@if [ -z "$(NAME)" ]; then \
		echo "ERROR: NAME is required (e.g. make migrate-create NAME=add_users_table)"; \
		exit 1; \
	fi
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq $(NAME)

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out

# Full clean including generated sqlc code
distclean: clean
	rm -rf db/sqlc/

# Install dependencies
deps:
	go mod download

# Install tools (golangci-lint, migrate, sqlc)
install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
