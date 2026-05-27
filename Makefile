.PHONY: build build-frontend build-backend dev dev-frontend dev-backend test lint vet docker-build docker-up docker-down clean install

.DEFAULT_GOAL := dev

BINARY := navhub
CMD_DIR := ./cmd/server
WEB_DIR := ./web
DOCKER_IMAGE := navhub
DATABASE_URL := file:./dev.db

# Build both frontend and backend
build: build-frontend build-backend

# Build frontend (Vite production build)
build-frontend:
	cd $(WEB_DIR) && npm run build

# Build Go binary
build-backend:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BINARY) $(CMD_DIR)

# Start both dev servers
dev:
	cd $(WEB_DIR) && npm run dev &
	DATABASE_URL=$(DATABASE_URL) go run $(CMD_DIR)

# Start Vite dev server
dev-frontend:
	cd $(WEB_DIR) && npm run dev

# Start Go backend
dev-backend:
	DATABASE_URL=$(DATABASE_URL) go run $(CMD_DIR)

# Run Go tests
test:
	go test ./...

# Run Go vet
lint: vet

vet:
	go vet ./...

# Install frontend dependencies
install:
	cd $(WEB_DIR) && npm ci

# Docker commands
docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-up:
	docker compose up -d

docker-down:
	docker compose down

# Run Go backend directly (after build)
run: build-backend
	DATABASE_URL=$(DATABASE_URL) ./$(BINARY)

# Clean build artifacts
clean:
	rm -f $(BINARY)
	rm -rf $(CMD_DIR)/web/dist