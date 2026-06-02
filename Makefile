.PHONY: build build-frontend build-backend dev dev-frontend dev-backend hot test lint vet docker-build docker-up docker-down clean install

.DEFAULT_GOAL := dev

BINARY := bin/navhub
CMD_DIR := ./cmd/server
WEB_DIR := ./web
DOCKER_IMAGE := navhub
DATABASE_URL := file:./data/db.sqlite

# Build both frontend and backend
build: build-frontend build-backend

# Build frontend (Vite production build)
build-frontend:
	cd $(WEB_DIR) && npm run build

# Build Go binary
build-backend:
	@mkdir -p bin
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

# Hot reload: run Vite dev server + Go backend via air (auto-restart on Go changes)
hot:
	@if ! command -v air >/dev/null 2>&1; then \
		echo "❌ 'air' not found. Install it with: go install github.com/air-verse/air@latest"; \
		exit 1; \
	fi
	@if [ ! -f $(WEB_DIR)/node_modules/.package-lock.json ]; then \
		echo "📦 Installing frontend dependencies..."; \
		cd $(WEB_DIR) && npm install; \
	fi
	@echo "🚀 Starting Vite dev server (background)..."
	@cd $(WEB_DIR) && nohup npm run dev > /tmp/navhub-vite.log 2>&1 & echo $$! > /tmp/navhub-vite.pid
	@trap 'kill $$(cat /tmp/navhub-vite.pid 2>/dev/null) 2>/dev/null; rm -f /tmp/navhub-vite.pid' EXIT; \
	DATABASE_URL=$(DATABASE_URL) air -c .air.toml

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
	rm -rf bin/
	rm -rf $(CMD_DIR)/web/dist