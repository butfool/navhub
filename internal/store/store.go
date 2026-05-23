package store

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"

	_ "modernc.org/sqlite"
	"navhub/internal/model"
)

var (
	ErrNotFound      = errors.New("record not found")
	ErrAlreadyExists = errors.New("record already exists")
)

type DB struct {
	db *sql.DB
}

func New(dbPath string) (*DB, error) {
	// Create data directory if it doesn't exist
	dir := strings.TrimSuffix(dbPath, "/db.sqlite")
	dir = strings.TrimSuffix(dir, ".sqlite")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("creating data directory: %w", err)
	}

	// Strip file: prefix if present
	dbPath = strings.TrimPrefix(dbPath, "file:")
	if !strings.Contains(dbPath, "/") {
		dbPath = "./" + dbPath
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("enabling foreign keys: %w", err)
	}

	return &DB{db: db}, nil
}

func (d *DB) Close() error {
	return d.db.Close()
}

// Category operations

func (d *DB) GetCategories() ([]model.Category, error) {
	rows, err := d.db.Query(`
		SELECT id, name, icon, color, "order", createdAt, updatedAt
		FROM Category
		ORDER BY "order" ASC, name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Icon, &c.Color, &c.Order, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}

	// Fetch services for each category
	for i := range categories {
		services, err := d.GetServicesByCategory(categories[i].ID)
		if err != nil {
			return nil, err
		}
		categories[i].Services = services
	}

	return categories, nil
}

func (d *DB) GetCategoryByID(id string) (*model.Category, error) {
	var c model.Category
	err := d.db.QueryRow(`
		SELECT id, name, icon, color, "order", createdAt, updatedAt
		FROM Category WHERE id = ?
	`, id).Scan(&c.ID, &c.Name, &c.Icon, &c.Color, &c.Order, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (d *DB) CreateCategory(c *model.Category) error {
	// Get max order
	var maxOrder sql.NullInt64
	err := d.db.QueryRow("SELECT MAX(\"order\") FROM Category").Scan(&maxOrder)
	if err != nil {
		return err
	}
	c.Order = 0
	if maxOrder.Valid {
		c.Order = int(maxOrder.Int64) + 1
	}

	_, err = d.db.Exec(`
		INSERT INTO Category (id, name, icon, color, "order", createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, c.ID, c.Name, c.Icon, c.Color, c.Order, c.CreatedAt, c.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return ErrAlreadyExists
		}
		return err
	}
	return nil
}

func (d *DB) UpdateCategory(c *model.Category) error {
	result, err := d.db.Exec(`
		UPDATE Category SET name = ?, icon = ?, color = ?, "order" = ?, updatedAt = ?
		WHERE id = ?
	`, c.Name, c.Icon, c.Color, c.Order, c.UpdatedAt, c.ID)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return ErrAlreadyExists
		}
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (d *DB) DeleteCategory(id string) error {
	result, err := d.db.Exec("DELETE FROM Category WHERE id = ?", id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

// Service operations

func (d *DB) GetServices() ([]model.Service, error) {
	rows, err := d.db.Query(`
		SELECT id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt
		FROM Service
		ORDER BY "order" ASC, name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []model.Service
	for rows.Next() {
		var s model.Service
		var categoryID sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &categoryID, &s.URL, &s.Description, &s.Icon, &s.Color, &s.Order, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		if categoryID.Valid {
			s.CategoryID = categoryID.String
		}
		services = append(services, s)
	}

	// Fetch category for each service
	for i := range services {
		if services[i].CategoryID != "" {
			cat, err := d.GetCategoryByID(services[i].CategoryID)
			if err == nil {
				services[i].Category = cat
			}
		}
	}

	return services, nil
}

func (d *DB) GetServicesByCategory(categoryID string) ([]model.Service, error) {
	rows, err := d.db.Query(`
		SELECT id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt
		FROM Service
		WHERE categoryId = ?
		ORDER BY "order" ASC, name ASC
	`, categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []model.Service
	for rows.Next() {
		var s model.Service
		var catID sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &catID, &s.URL, &s.Description, &s.Icon, &s.Color, &s.Order, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		if catID.Valid {
			s.CategoryID = catID.String
		}
		services = append(services, s)
	}
	return services, nil
}

func (d *DB) GetServiceByID(id string) (*model.Service, error) {
	var s model.Service
	var categoryID sql.NullString
	err := d.db.QueryRow(`
		SELECT id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt
		FROM Service WHERE id = ?
	`, id).Scan(&s.ID, &s.Name, &categoryID, &s.URL, &s.Description, &s.Icon, &s.Color, &s.Order, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if categoryID.Valid {
		s.CategoryID = categoryID.String
	}
	return &s, nil
}

func (d *DB) CreateService(s *model.Service) error {
	// Get max order within category
	var maxOrder sql.NullInt64
	err := d.db.QueryRow("SELECT MAX(\"order\") FROM Service WHERE categoryId = ?", s.CategoryID).Scan(&maxOrder)
	if err != nil {
		return err
	}
	s.Order = 0
	if maxOrder.Valid {
		s.Order = int(maxOrder.Int64) + 1
	}

	_, err = d.db.Exec(`
		INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, s.ID, s.Name, s.CategoryID, s.URL, s.Description, s.Icon, s.Color, s.Order, s.CreatedAt, s.UpdatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (d *DB) UpdateService(s *model.Service) error {
	result, err := d.db.Exec(`
		UPDATE Service SET name = ?, categoryId = ?, url = ?, description = ?, icon = ?, color = ?, "order" = ?, updatedAt = ?
		WHERE id = ?
	`, s.Name, s.CategoryID, s.URL, s.Description, s.Icon, s.Color, s.Order, s.UpdatedAt, s.ID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (d *DB) DeleteService(id string) error {
	result, err := d.db.Exec("DELETE FROM Service WHERE id = ?", id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (d *DB) GetCategoryByServiceID(serviceID string) (*model.Category, error) {
	var categoryID sql.NullString
	err := d.db.QueryRow("SELECT categoryId FROM Service WHERE id = ?", serviceID).Scan(&categoryID)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if !categoryID.Valid || categoryID.String == "" {
		return nil, ErrNotFound
	}
	return d.GetCategoryByID(categoryID.String)
}