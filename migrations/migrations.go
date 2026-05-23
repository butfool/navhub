package main

import (
	"database/sql"
	"embed"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func runMigrations(db *store.DB) error {
	// Create migrations table
	_, err := db.db.Exec(`
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

	// Read migration files
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
		// Check if already applied
		var count int
		version := strings.TrimSuffix(f, ".sql")
		err := db.db.QueryRow("SELECT COUNT(*) FROM goose_db_version WHERE version_id = ? AND is_applied = TRUE", version).Scan(&count)
		if err != nil && err != sql.ErrNoRows {
			return err
		}
		if count > 0 {
			continue
		}

		// Read and execute migration
		content, err := migrationsFS.ReadFile(filepath.Join("migrations", f))
		if err != nil {
			return err
		}

		_, err = db.db.Exec(string(content))
		if err != nil {
			return err
		}

		// Record migration
		_, err = db.db.Exec("INSERT INTO goose_db_version (version_id, tstamp, is_applied) VALUES (?, CURRENT_TIMESTAMP, TRUE)", version)
		if err != nil {
			return err
		}

		log.Printf("Applied migration: %s", f)
	}

	return nil
}