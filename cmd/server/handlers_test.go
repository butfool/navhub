package main

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// --- Package-level globals ---

var testHandler *Handler
var testServer http.Handler

// setup creates a fresh in-memory SQLite DB with migrations and seed data.
// Call at the START of every test AND every subtest that depends on seed data.
func setup(t *testing.T) {
	if testHandler != nil && testHandler.store != nil {
		testHandler.store.Close()
	}

	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		t.Fatalf("failed to enable foreign keys: %v", err)
	}

	store := &Store{db: db}

	if err := runMigrations(store.db); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	seedTestData(store.db)
	testHandler = NewHandler(store)

	h := testHandler
	testServer = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/categories":
			switch r.Method {
			case "GET": h.GetCategories(w, r); return
			case "POST": h.CreateCategory(w, r); return
			case "PUT": h.UpdateCategory(w, r); return
			case "DELETE": h.DeleteCategory(w, r); return
			}
		case "/api/services":
			switch r.Method {
			case "GET": h.GetServices(w, r); return
			case "POST": h.CreateService(w, r); return
			case "PUT": h.UpdateService(w, r); return
			case "DELETE": h.DeleteService(w, r); return
			}
		}
		http.Error(w, "Not found", http.StatusNotFound)
	})
}

// --- Helpers ---

// clearTables wipes seed data so tests can start from a known empty state.
// Prefer calling setup(t) instead for subtests that need fresh seed data.
func clearTables() {
	if testHandler != nil && testHandler.store != nil {
		testHandler.store.db.Exec("DELETE FROM Service")
		testHandler.store.db.Exec("DELETE FROM Category")
	}
}

func req(method, path string, body io.Reader) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, body)
	if body != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	w := httptest.NewRecorder()
	testServer.ServeHTTP(w, r)
	return w
}

// --- Seed ---

func seedTestData(db *sql.DB) {
	db.Exec(`DELETE FROM Service`)
	db.Exec(`DELETE FROM Category`)

	db.Exec(`INSERT INTO Category (id, name, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"seed-cat-dev", "开发工具", "lucide:code", "#4f46e5", 0, now(), now())
	db.Exec(`INSERT INTO Category (id, name, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"seed-cat-ops", "运维工具", "lucide:server", "#059669", 1, now(), now())
	db.Exec(`INSERT INTO Category (id, name, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"seed-cat-doc", "文档资源", "lucide:book-open", "#dc2626", 2, now(), now())

	db.Exec(`INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"seed-svc-1-dev", "GitHub", "seed-cat-dev", "https://github.com", "GitHub 代码托管平台", "si:github", "#333333", 0, now(), now())
	db.Exec(`INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"seed-svc-2-dev", "GitLab", "seed-cat-dev", "https://gitlab.com", "GitLab 代码托管平台", "si:gitlab", "#fc6d26", 1, now(), now())
	db.Exec(`INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"seed-svc-3-ops", "Grafana", "seed-cat-ops", "https://grafana.com", "开源可观测性平台", "si:grafana", "#f46800", 0, now(), now())
	db.Exec(`INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"seed-svc-4-ops", "Prometheus", "seed-cat-ops", "https://prometheus.io", "监控系统", "si:prometheus", "#e6522c", 1, now(), now())
	db.Exec(`INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"seed-svc-5-doc", "MDN", "seed-cat-doc", "https://developer.mozilla.org", "MDN Web 文档", "lucide:globe", "#4f46e5", 0, now(), now())
	db.Exec(`INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"seed-svc-6-doc", "Docker Docs", "seed-cat-doc", "https://docs.docker.com", "Docker 官方文档", "si:docker", "#2496ed", 1, now(), now())
}

func now() time.Time { return time.Now() }

// --- Category Tests ---

func TestGetCategories(t *testing.T) {
	setup(t)
	w := req("GET", "/api/categories", nil)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var cats []Category
	if err := json.Unmarshal(w.Body.Bytes(), &cats); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}

	if len(cats) != 3 {
		t.Fatalf("expected 3 categories, got %d", len(cats))
	}

	if cats[0].Name != "开发工具" || len(cats[0].Services) != 2 {
		t.Fatalf("unexpected first category: %+v", cats[0])
	}

	svcNames := make([]string, len(cats[0].Services))
	for i, s := range cats[0].Services {
		svcNames[i] = s.Name
	}
	if svcNames[0] != "GitHub" || svcNames[1] != "GitLab" {
		t.Errorf("unexpected services in first category: %v", svcNames)
	}
}

func TestGetCategories_Empty(t *testing.T) {
	setup(t)
	clearTables()
	w := req("GET", "/api/categories", nil)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var cats []Category
	json.Unmarshal(w.Body.Bytes(), &cats)
	if len(cats) != 0 {
		t.Errorf("expected empty array, got %d categories", len(cats))
	}
}

func TestCreateCategory(t *testing.T) {
	setup(t)
	tests := []struct {
		name     string
		payload  string
		wantCode int
	}{
		{
			name:     "valid",
			payload:  `{"name":"My Category","icon":"lucide:star","color":"#ff0000"}`,
			wantCode: 201,
		},
		{
			name:     "valid_empty_fields",
			payload:  `{"name":"Bare"}`,
			wantCode: 201,
		},
		{
			name:     "missing_name",
			payload:  `{"icon":"lucide:x"}`,
			wantCode: 400,
		},
		{
			name:     "empty_name",
			payload:  `{"name":""}`,
			wantCode: 400,
		},
		{
			name:     "duplicate_name",
			payload:  `{"name":"开发工具"}`,
			wantCode: 409,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setup(t) // fresh DB + seed for each subtest
			w := req("POST", "/api/categories", strings.NewReader(tt.payload))
			if w.Code != tt.wantCode {
				t.Errorf("want %d, got %d: %s", tt.wantCode, w.Code, w.Body.String())
			}
			if tt.wantCode == 201 {
				var cat Category
				json.Unmarshal(w.Body.Bytes(), &cat)
				if cat.ID == "" {
					t.Errorf("expected non-empty ID in response")
				}
			}
		})
	}
}

func TestUpdateCategory(t *testing.T) {
	setup(t)
	tests := []struct {
		name     string
		query    string
		payload  string
		wantCode int
	}{
		{
			name:     "full_update",
			query:    "?id=seed-cat-dev",
			payload:  `{"name":"Dev Tools","icon":"lucide:hammer","color":"#aaaaaa","order":99}`,
			wantCode: 200,
		},
		{
			name:     "partial_update_name_only",
			query:    "?id=seed-cat-dev",
			payload:  `{"name":"New Name"}`,
			wantCode: 200,
		},
		{
			name:     "not_found",
			query:    "?id=nonexistent",
			payload:  `{"name":"X"}`,
			wantCode: 404,
		},
		{
			name:     "missing_id",
			query:    "",
			payload:  `{"name":"X"}`,
			wantCode: 400,
		},
		{
			name:     "empty_name",
			query:    "?id=seed-cat-dev",
			payload:  `{"name":""}`,
			wantCode: 400,
		},
		{
			name:     "duplicate_name",
			query:    "?id=seed-cat-ops",
			payload:  `{"name":"开发工具"}`,
			wantCode: 409,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setup(t) // fresh DB + seed for each subtest
			w := req("PUT", "/api/categories"+tt.query, strings.NewReader(tt.payload))
			if w.Code != tt.wantCode {
				t.Errorf("want %d, got %d: %s", tt.wantCode, w.Code, w.Body.String())
			}
		})
	}
}

func TestDeleteCategory(t *testing.T) {
	setup(t)
	tests := []struct {
		name     string
		query    string
		wantCode int
	}{
		{name: "valid", query: "?id=seed-cat-dev", wantCode: 200},
		{name: "not_found", query: "?id=nonexistent", wantCode: 404},
		{name: "missing_id", query: "", wantCode: 400},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setup(t) // fresh DB + seed for each subtest
			w := req("DELETE", "/api/categories"+tt.query, nil)
			if w.Code != tt.wantCode {
				t.Errorf("want %d, got %d: %s", tt.wantCode, w.Code, w.Body.String())
			}
		})
	}
}

func TestDeleteCategory_Cascade(t *testing.T) {
	setup(t) // fresh DB + seed
	// seed-cat-dev has 2 services (GitHub, GitLab)
	w := req("DELETE", "/api/categories?id=seed-cat-dev", nil)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var count int
	testHandler.store.db.QueryRow("SELECT COUNT(*) FROM Service WHERE categoryId = ?", "seed-cat-dev").Scan(&count)
	if count != 0 {
		t.Errorf("expected 0 services after category delete, got %d", count)
	}

	testHandler.store.db.QueryRow("SELECT COUNT(*) FROM Category WHERE id = ?", "seed-cat-dev").Scan(&count)
	if count != 0 {
		t.Errorf("expected category to be deleted, got %d", count)
	}
}

// --- Service Tests ---

func TestGetServices(t *testing.T) {
	setup(t)
	w := req("GET", "/api/services", nil)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var svcs []Service
	if err := json.Unmarshal(w.Body.Bytes(), &svcs); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}

	if len(svcs) != 6 {
		t.Fatalf("expected 6 services, got %d", len(svcs))
	}

	found := false
	for _, s := range svcs {
		if s.Name == "GitHub" && s.Category != nil && s.Category.Name == "开发工具" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected GitHub service to have nested category")
	}
}

func TestGetServices_Empty(t *testing.T) {
	setup(t)
	clearTables()
	w := req("GET", "/api/services", nil)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var svcs []Service
	json.Unmarshal(w.Body.Bytes(), &svcs)
	if len(svcs) != 0 {
		t.Errorf("expected empty array, got %d services", len(svcs))
	}
}

func TestCreateService(t *testing.T) {
	setup(t)
	tests := []struct {
		name     string
		payload  string
		wantCode int
	}{
		{
			name:     "valid",
			payload:  `{"name":"Test Service","categoryId":"seed-cat-dev","url":"https://example.com","description":"A test","icon":"lucide:box","color":"#123456"}`,
			wantCode: 201,
		},
		{
			name:     "valid_minimal",
			payload:  `{"name":"Minimal","categoryId":"seed-cat-ops","url":""}`,
			wantCode: 201,
		},
		{
			name:     "missing_name",
			payload:  `{"categoryId":"seed-cat-dev","url":"https://example.com"}`,
			wantCode: 400,
		},
		{
			name:     "empty_name",
			payload:  `{"name":"","categoryId":"seed-cat-dev","url":"https://example.com"}`,
			wantCode: 400,
		},
		{
			name:     "category_not_found",
			payload:  `{"name":"Orphan","categoryId":"nonexistent","url":"https://example.com"}`,
			wantCode: 404,
		},
		{
			name:     "invalid_url_scheme",
			payload:  `{"name":"Bad","categoryId":"seed-cat-dev","url":"javascript://alert(1)"}`,
			wantCode: 400,
		},
		{
			name:     "valid_url_no_scheme",
			payload:  `{"name":"NoScheme","categoryId":"seed-cat-dev","url":"not-a-url"}`,
			wantCode: 201,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setup(t) // fresh DB + seed for each subtest
			w := req("POST", "/api/services", strings.NewReader(tt.payload))
			if w.Code != tt.wantCode {
				t.Errorf("want %d, got %d: %s", tt.wantCode, w.Code, w.Body.String())
			}
			if tt.wantCode == 201 {
				var svc Service
				json.Unmarshal(w.Body.Bytes(), &svc)
				if svc.ID == "" {
					t.Errorf("expected non-empty ID in response")
				}
			}
		})
	}
}

func TestUpdateService(t *testing.T) {
	setup(t)
	tests := []struct {
		name     string
		query    string
		payload  string
		wantCode int
	}{
		{
			name:     "full_update",
			query:    "?id=seed-svc-1-dev",
			payload:  `{"name":"Updated GitHub","url":"https://github.com/new","description":"Updated desc","icon":"si:githubalt","color":"#111111","order":99}`,
			wantCode: 200,
		},
		{
			name:     "partial_update",
			query:    "?id=seed-svc-1-dev",
			payload:  `{"name":"New Name Only"}`,
			wantCode: 200,
		},
		{
			name:     "update_category",
			query:    "?id=seed-svc-1-dev",
			payload:  `{"categoryId":"seed-cat-ops"}`,
			wantCode: 200,
		},
		{
			name:     "not_found",
			query:    "?id=nonexistent",
			payload:  `{"name":"X"}`,
			wantCode: 404,
		},
		{
			name:     "missing_id",
			query:    "",
			payload:  `{"name":"X"}`,
			wantCode: 400,
		},
		{
			name:     "empty_name",
			query:    "?id=seed-svc-1-dev",
			payload:  `{"name":""}`,
			wantCode: 400,
		},
		{
			name:     "invalid_url_scheme",
			query:    "?id=seed-svc-1-dev",
			payload:  `{"url":"javascript://alert(1)"}`,
			wantCode: 400,
		},
		{
			name:     "update_to_nonexistent_category",
			query:    "?id=seed-svc-1-dev",
			payload:  `{"categoryId":"nonexistent-cat"}`,
			wantCode: 404,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setup(t) // fresh DB + seed for each subtest
			w := req("PUT", "/api/services"+tt.query, strings.NewReader(tt.payload))
			if w.Code != tt.wantCode {
				t.Errorf("want %d, got %d: %s", tt.wantCode, w.Code, w.Body.String())
			}
		})
	}
}

func TestDeleteService(t *testing.T) {
	setup(t)
	tests := []struct {
		name     string
		query    string
		wantCode int
	}{
		{name: "valid", query: "?id=seed-svc-1-dev", wantCode: 200},
		{name: "not_found", query: "?id=nonexistent", wantCode: 404},
		{name: "missing_id", query: "", wantCode: 400},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setup(t) // fresh DB + seed for each subtest
			w := req("DELETE", "/api/services"+tt.query, nil)
			if w.Code != tt.wantCode {
				t.Errorf("want %d, got %d: %s", tt.wantCode, w.Code, w.Body.String())
			}
		})
	}
}

func TestDeleteService_VerifyGone(t *testing.T) {
	setup(t) // fresh DB + seed
	w := req("DELETE", "/api/services?id=seed-svc-1-dev", nil)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var count int
	testHandler.store.db.QueryRow("SELECT COUNT(*) FROM Service WHERE id = ?", "seed-svc-1-dev").Scan(&count)
	if count != 0 {
		t.Errorf("expected service to be deleted, got %d", count)
	}
}