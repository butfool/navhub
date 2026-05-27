package main

import (
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed web/dist
var staticFS embed.FS

var subFS, _ = fs.Sub(staticFS, "web/dist")

//go:embed migrations/*.sql
var migrationsFS embed.FS

// --- Models ---

type Category struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon"`
	Color     string    `json:"color"`
	Order     int       `json:"order"`
	Services  []Service `json:"services,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Service struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	CategoryID  string    `json:"categoryId"`
	Category    *Category `json:"category,omitempty"`
	URL         string    `json:"url"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	Color       string    `json:"color"`
	Order       int       `json:"order"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// --- Store ---

type Store struct {
	db *sql.DB
}

func NewStore(dbPath string) (*Store, error) {
	dir := strings.TrimPrefix(dbPath, "file:")
	dir = strings.TrimSuffix(dir, "/db.sqlite")
	dir = strings.TrimSuffix(dir, ".sqlite")
	os.MkdirAll(dir, 0755)

	dbPath = strings.TrimPrefix(dbPath, "file:")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, err
	}
	if _, err := db.Exec("PRAGMA journal_mode = WAL"); err != nil {
		return nil, err
	}
	if _, err := db.Exec("PRAGMA busy_timeout = 5000"); err != nil {
		return nil, err
	}
	if _, err := db.Exec("PRAGMA locking_mode = NORMAL"); err != nil {
		return nil, err
	}

	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

// Categories

func (s *Store) GetCategories() ([]Category, error) {
	rows, err := s.db.Query(`
		SELECT c.id, c.name, c.icon, c.color, c."order", c.createdAt, c.updatedAt,
			   s.id, s.name, s.categoryId, s.url, s.description, s.icon, s.color, s."order", s.createdAt, s.updatedAt
		FROM Category c
		LEFT JOIN Service s ON s.categoryId = c.id
		ORDER BY c."order" ASC, c.name ASC, s."order" ASC, s.name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categoryMap := make(map[string]*Category)
	for rows.Next() {
		var c Category
		var svc Service
		var svcID, svcName, svcCatID, svcURL, svcDesc, svcIcon, svcColor sql.NullString
		var svcOrder sql.NullInt64
		var svcCreatedAt, svcUpdatedAt sql.NullTime

		if err := rows.Scan(
			&c.ID, &c.Name, &c.Icon, &c.Color, &c.Order, &c.CreatedAt, &c.UpdatedAt,
			&svcID, &svcName, &svcCatID, &svcURL, &svcDesc, &svcIcon, &svcColor, &svcOrder, &svcCreatedAt, &svcUpdatedAt,
		); err != nil {
			return nil, err
		}

		if _, ok := categoryMap[c.ID]; !ok {
			cp := c // copy to avoid loop variable pointer aliasing
			cp.Services = []Service{}
			categoryMap[c.ID] = &cp
		}

		if svcID.Valid {
			svc.ID = svcID.String
			svc.Name = svcName.String
			svc.CategoryID = svcCatID.String
			svc.URL = svcURL.String
			svc.Description = svcDesc.String
			svc.Icon = svcIcon.String
			svc.Color = svcColor.String
			if svcOrder.Valid {
				svc.Order = int(svcOrder.Int64)
			}
			svc.CreatedAt = svcCreatedAt.Time
			svc.UpdatedAt = svcUpdatedAt.Time
			categoryMap[c.ID].Services = append(categoryMap[c.ID].Services, svc)
		}
	}

	result := make([]Category, 0, len(categoryMap))
	// Map iteration order is random, so we need to sort
	type catOrder struct {
		id    string
		order int
		name  string
	}
	orders := make([]catOrder, 0, len(categoryMap))
	for id, c := range categoryMap {
		orders = append(orders, catOrder{id, c.Order, c.Name})
	}
	sort.Slice(orders, func(i, j int) bool {
		if orders[i].order != orders[j].order {
			return orders[i].order < orders[j].order
		}
		return orders[i].name < orders[j].name
	})
	for _, co := range orders {
		result = append(result, *categoryMap[co.id])
	}
	return result, nil
}

func (s *Store) GetCategoryByID(id string) (*Category, error) {
	var c Category
	err := s.db.QueryRow(`SELECT id, name, icon, color, "order", createdAt, updatedAt FROM Category WHERE id = ?`, id).
		Scan(&c.ID, &c.Name, &c.Icon, &c.Color, &c.Order, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Store) CreateCategory(c *Category) error {
	var maxOrder sql.NullInt64
	if err := s.db.QueryRow("SELECT MAX(\"order\") FROM Category").Scan(&maxOrder); err != nil {
		return fmt.Errorf("fetching max order: %w", err)
	}
	if maxOrder.Valid {
		c.Order = int(maxOrder.Int64) + 1
	} else {
		c.Order = 0
	}
	_, err := s.db.Exec(`INSERT INTO Category (id, name, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		c.ID, c.Name, c.Icon, c.Color, c.Order, c.CreatedAt, c.UpdatedAt)
	if err != nil && strings.Contains(err.Error(), "UNIQUE") {
		return ErrAlreadyExists
	}
	return err
}

func (s *Store) UpdateCategory(c *Category) error {
	const maxRetries = 3
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		res, err := s.db.Exec(`UPDATE Category SET name = ?, icon = ?, color = ?, "order" = ?, updatedAt = ? WHERE id = ?`,
			c.Name, c.Icon, c.Color, c.Order, c.UpdatedAt, c.ID)
		if err == nil {
			if n, _ := res.RowsAffected(); n == 0 {
				return ErrNotFound
			}
			return nil
		}
		if strings.Contains(err.Error(), "UNIQUE") {
			return ErrAlreadyExists
		}
		// Retry on SQLITE_BUSY
		if strings.Contains(err.Error(), "SQLITE_BUSY") || strings.Contains(err.Error(), "database is locked") {
			lastErr = err
			time.Sleep(time.Duration(50*(i+1)) * time.Millisecond)
			continue
		}
		return err
	}
	return fmt.Errorf("update failed after %d retries: %w", maxRetries, lastErr)
}

func (s *Store) DeleteCategory(id string) error {
	res, err := s.db.Exec("DELETE FROM Category WHERE id = ?", id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// Services

func (s *Store) GetServices() ([]Service, error) {
	rows, err := s.db.Query(`SELECT id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt FROM Service ORDER BY "order" ASC, name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []Service
	for rows.Next() {
		var svc Service
		var catID sql.NullString
		if err := rows.Scan(&svc.ID, &svc.Name, &catID, &svc.URL, &svc.Description, &svc.Icon, &svc.Color, &svc.Order, &svc.CreatedAt, &svc.UpdatedAt); err != nil {
			return nil, err
		}
		if catID.Valid {
			svc.CategoryID = catID.String
		}
		if svc.CategoryID != "" {
			if cat, err := s.GetCategoryByID(svc.CategoryID); err == nil {
				svc.Category = cat
			}
		}
		services = append(services, svc)
	}
	return services, nil
}

func (s *Store) GetServicesByCategory(catID string) ([]Service, error) {
	rows, err := s.db.Query(`SELECT id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt FROM Service WHERE categoryId = ? ORDER BY "order" ASC, name ASC`, catID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []Service
	for rows.Next() {
		var svc Service
		var cid sql.NullString
		if err := rows.Scan(&svc.ID, &svc.Name, &cid, &svc.URL, &svc.Description, &svc.Icon, &svc.Color, &svc.Order, &svc.CreatedAt, &svc.UpdatedAt); err != nil {
			return nil, err
		}
		if cid.Valid {
			svc.CategoryID = cid.String
		}
		services = append(services, svc)
	}
	return services, nil
}

func (s *Store) GetServiceByID(id string) (*Service, error) {
	var svc Service
	var catID sql.NullString
	err := s.db.QueryRow(`SELECT id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt FROM Service WHERE id = ?`, id).
		Scan(&svc.ID, &svc.Name, &catID, &svc.URL, &svc.Description, &svc.Icon, &svc.Color, &svc.Order, &svc.CreatedAt, &svc.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if catID.Valid {
		svc.CategoryID = catID.String
	}
	return &svc, nil
}

func (s *Store) CreateService(svc *Service) error {
	var maxOrder sql.NullInt64
	if err := s.db.QueryRow("SELECT MAX(\"order\") FROM Service WHERE categoryId = ?", svc.CategoryID).Scan(&maxOrder); err != nil {
		return fmt.Errorf("fetching max order: %w", err)
	}
	if maxOrder.Valid {
		svc.Order = int(maxOrder.Int64) + 1
	} else {
		svc.Order = 0
	}
	_, err := s.db.Exec(`INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		svc.ID, svc.Name, svc.CategoryID, svc.URL, svc.Description, svc.Icon, svc.Color, svc.Order, svc.CreatedAt, svc.UpdatedAt)
	return err
}

func (s *Store) UpdateService(svc *Service) error {
	const maxRetries = 3
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		res, err := s.db.Exec(`UPDATE Service SET name = ?, categoryId = ?, url = ?, description = ?, icon = ?, color = ?, "order" = ?, updatedAt = ? WHERE id = ?`,
			svc.Name, svc.CategoryID, svc.URL, svc.Description, svc.Icon, svc.Color, svc.Order, svc.UpdatedAt, svc.ID)
		if err == nil {
			if n, _ := res.RowsAffected(); n == 0 {
				return ErrNotFound
			}
			return nil
		}
		if strings.Contains(err.Error(), "UNIQUE") {
			return ErrAlreadyExists
		}
		if strings.Contains(err.Error(), "SQLITE_BUSY") || strings.Contains(err.Error(), "database is locked") {
			lastErr = err
			time.Sleep(time.Duration(50*(i+1)) * time.Millisecond)
			continue
		}
		return err
	}
	return fmt.Errorf("update failed after %d retries: %w", maxRetries, lastErr)
}

func (s *Store) DeleteService(id string) error {
	res, err := s.db.Exec("DELETE FROM Service WHERE id = ?", id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Errors ---

var ErrNotFound = &apiError{code: 404, msg: "Related record not found"}
var ErrAlreadyExists = &apiError{code: 409, msg: "Record already exists"}
var ErrBadRequest = &apiError{code: 400, msg: "Invalid request"}

type apiError struct {
	code int
	msg  string
}

func (e *apiError) Error() string { return e.msg }

// --- Handlers ---

type Handler struct {
	store *Store
}

func NewHandler(store *Store) *Handler { return &Handler{store: store} }

func (h *Handler) error(w http.ResponseWriter, status int, msg string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (h *Handler) json(w http.ResponseWriter, status int, v interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// GET /api/categories
func (h *Handler) GetCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.store.GetCategories()
	if err != nil {
		h.error(w, 500, "Failed to fetch categories")
		return
	}
	if cats == nil {
		cats = []Category{}
	}
	h.json(w, 200, cats)
}

// POST /api/categories
func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name  string `json:"name"`
		Icon  string `json:"icon"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		h.error(w, 400, "Invalid request body")
		return
	}
	if strings.TrimSpace(input.Name) == "" {
		h.error(w, 400, "Name is required")
		return
	}
	now := time.Now()
	cat := &Category{
		ID:        newID(),
		Name:      input.Name,
		Icon:      input.Icon,
		Color:     input.Color,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := h.store.CreateCategory(cat); err != nil {
		if err == ErrAlreadyExists {
			h.error(w, 409, "Record already exists")
			return
		}
		h.error(w, 500, "Failed to create category")
		return
	}
	h.json(w, 201, cat)
}

// PUT /api/categories
func (h *Handler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		h.error(w, 400, "Missing id parameter")
		return
	}
	var input struct {
		Name  *string `json:"name,omitempty"`
		Icon  *string `json:"icon,omitempty"`
		Color *string `json:"color,omitempty"`
		Order *int    `json:"order,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		h.error(w, 400, "Invalid request body")
		return
	}
	cat, err := h.store.GetCategoryByID(id)
	if err != nil {
		if err == ErrNotFound {
			h.error(w, 404, "Related record not found")
			return
		}
		h.error(w, 500, "Failed to fetch category")
		return
	}
	if input.Name != nil {
		if strings.TrimSpace(*input.Name) == "" {
			h.error(w, 400, "Name is required")
			return
		}
		cat.Name = *input.Name
	}
	if input.Icon != nil {
		cat.Icon = *input.Icon
	}
	if input.Color != nil {
		cat.Color = *input.Color
	}
	if input.Order != nil {
		cat.Order = *input.Order
	}
	cat.UpdatedAt = time.Now()
	if err := h.store.UpdateCategory(cat); err != nil {
		log.Printf("UpdateCategory error: id=%s, err=%v (type=%T)", id, err, err)
		errMsg := fmt.Sprintf("UpdateCategory failed: %v", err)
		if err == ErrAlreadyExists {
			h.error(w, 409, "Record already exists")
			return
		}
		if err == ErrNotFound {
			h.error(w, 404, "Related record not found")
			return
		}
		h.error(w, 500, errMsg)
		return
	}
	h.json(w, 200, cat)
}

// DELETE /api/categories
func (h *Handler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		h.error(w, 400, "Missing id parameter")
		return
	}
	if err := h.store.DeleteCategory(id); err != nil {
		if err == ErrNotFound {
			h.error(w, 404, "Related record not found")
			return
		}
		h.error(w, 500, "Failed to delete category")
		return
	}
	h.json(w, 200, map[string]bool{"success": true})
}

// GET /api/services
func (h *Handler) GetServices(w http.ResponseWriter, r *http.Request) {
	svcs, err := h.store.GetServices()
	if err != nil {
		h.error(w, 500, "Failed to fetch services")
		return
	}
	if svcs == nil {
		svcs = []Service{}
	}
	h.json(w, 200, svcs)
}

// POST /api/services
func (h *Handler) CreateService(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name       string `json:"name"`
		CategoryID string `json:"categoryId"`
		URL        string `json:"url"`
		Description string `json:"description"`
		Icon       string `json:"icon"`
		Color      string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		h.error(w, 400, "Invalid request body")
		return
	}
	if strings.TrimSpace(input.Name) == "" {
		h.error(w, 400, "Name is required")
		return
	}
	if !validURL(input.URL) {
		h.error(w, 400, "Invalid URL scheme")
		return
	}
	// Verify category exists
	if _, err := h.store.GetCategoryByID(input.CategoryID); err != nil {
		h.error(w, 404, "Related record not found")
		return
	}
	now := time.Now()
	svc := &Service{
		ID:          newID(),
		Name:        input.Name,
		CategoryID:  input.CategoryID,
		URL:         input.URL,
		Description: input.Description,
		Icon:        input.Icon,
		Color:       input.Color,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := h.store.CreateService(svc); err != nil {
		h.error(w, 500, "Failed to create service")
		return
	}
	if cat, err := h.store.GetCategoryByID(svc.CategoryID); err == nil {
		svc.Category = cat
	}
	h.json(w, 201, svc)
}

// PUT /api/services
func (h *Handler) UpdateService(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		h.error(w, 400, "Missing id parameter")
		return
	}
	var input struct {
		Name        *string `json:"name,omitempty"`
		CategoryID  *string `json:"categoryId,omitempty"`
		URL         *string `json:"url,omitempty"`
		Description *string `json:"description,omitempty"`
		Icon        *string `json:"icon,omitempty"`
		Color       *string `json:"color,omitempty"`
		Order       *int    `json:"order,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		h.error(w, 400, "Invalid request body")
		return
	}
	svc, err := h.store.GetServiceByID(id)
	if err != nil {
		if err == ErrNotFound {
			h.error(w, 404, "Related record not found")
			return
		}
		h.error(w, 500, "Failed to fetch service")
		return
	}
	if input.Name != nil {
		if strings.TrimSpace(*input.Name) == "" {
			h.error(w, 400, "Name is required")
			return
		}
		svc.Name = *input.Name
	}
	if input.CategoryID != nil {
		if _, err := h.store.GetCategoryByID(*input.CategoryID); err != nil {
			h.error(w, 404, "Related record not found")
			return
		}
		svc.CategoryID = *input.CategoryID
	}
	if input.URL != nil {
		if !validURL(*input.URL) {
			h.error(w, 400, "Invalid URL scheme")
			return
		}
		svc.URL = *input.URL
	}
	if input.Description != nil {
		svc.Description = *input.Description
	}
	if input.Icon != nil {
		svc.Icon = *input.Icon
	}
	if input.Color != nil {
		svc.Color = *input.Color
	}
	if input.Order != nil {
		svc.Order = *input.Order
	}
	svc.UpdatedAt = time.Now()
	if err := h.store.UpdateService(svc); err != nil {
		if err == ErrNotFound {
			h.error(w, 404, "Related record not found")
			return
		}
		h.error(w, 500, "Failed to update service")
		return
	}
	if cat, err := h.store.GetCategoryByID(svc.CategoryID); err == nil {
		svc.Category = cat
	}
	h.json(w, 200, svc)
}

// DELETE /api/services
func (h *Handler) DeleteService(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		h.error(w, 400, "Missing id parameter")
		return
	}
	if err := h.store.DeleteService(id); err != nil {
		if err == ErrNotFound {
			h.error(w, 404, "Related record not found")
			return
		}
		h.error(w, 500, "Failed to delete service")
		return
	}
	h.json(w, 200, map[string]bool{"success": true})
}

// --- URL validation ---

var blockedSchemes = []string{"javascript", "data", "vbscript"}

func validURL(s string) bool {
	if s == "" {
		return true
	}
	// Allow non-URL strings for compatibility
	if !strings.Contains(s, "://") {
		return true
	}
	for _, scheme := range blockedSchemes {
		if strings.HasPrefix(strings.ToLower(s), scheme+":") {
			return false
		}
	}
	return true
}

// --- ID generation ---

func newID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		// Fallback to nanoseconds only if crypto rand fails (extremely unlikely)
		bs := time.Now().UnixNano()
		for i := range b {
			b[i] = byte(bs >> (i * 8))
		}
	}
	return fmt.Sprintf("%x", b)
}

// --- Migrations ---

func runMigrations(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS goose_db_version (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			version_id INT NOT NULL,
			tstamp DATETIME,
			is_applied BOOLEAN,
			env VARCHAR(100)
		)
	`)
	if err != nil {
		return err
	}

	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return err
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, f := range files {
		var count int
		version := strings.TrimSuffix(f, ".sql")
		if err := db.QueryRow("SELECT COUNT(*) FROM goose_db_version WHERE version_id = ? AND is_applied = TRUE", version).Scan(&count); err != nil {
			return fmt.Errorf("checking migration status for %s: %w", version, err)
		}
		if count > 0 {
			continue
		}

		content, err := migrationsFS.ReadFile(filepath.Join("migrations", f))
		if err != nil {
			return err
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("beginning transaction: %w", err)
		}
		if _, err := tx.Exec(string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("applying migration %s: %w", f, err)
		}
		if _, err := tx.Exec("INSERT INTO goose_db_version (version_id, tstamp, is_applied) VALUES (?, CURRENT_TIMESTAMP, TRUE)", version); err != nil {
			tx.Rollback()
			return fmt.Errorf("logging migration %s: %w", f, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("committing migration %s: %w", f, err)
		}
		log.Printf("Applied migration: %s", f)
	}
	return nil
}

// --- Main ---

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "file:./dev.db"
	}
	store, err := NewStore(dbURL)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer store.Close()

	if err := runMigrations(store.db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Warn if no categories exist (fresh database with no seed data)
	var count int
	store.db.QueryRow("SELECT COUNT(*) FROM Category").Scan(&count)
	if count == 0 {
		log.Printf("Warning: No categories found. Database may be empty. Run 'go run scripts/seed.go' to populate sample data.")
	}

	h := NewHandler(store)

	// Use a custom handler to avoid mux pattern conflicts
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// API routes
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

		// Static assets
		if strings.HasPrefix(r.URL.Path, "/assets/") {
			http.FileServer(http.FS(subFS)).ServeHTTP(w, r)
			return
		}

		// SPA fallback
		data, err := staticFS.ReadFile("web/dist/index.html")
		if err != nil {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "text/html")
		w.Write(data)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "51235"
	}

	log.Printf("Server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}