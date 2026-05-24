package main

import (
	"database/sql"
	"flag"
	"fmt"
	"os"
	"strings"

	_ "modernc.org/sqlite"
)

type Category struct {
	ID    string
	Name  string
	Icon  string
	Color string
}

type Service struct {
	Name        string
	CategoryID  string
	URL         string
	Description string
	Icon        string
	Color       string
}

var serviceIDCounter = 0

func nextServiceID(categoryID string) string {
	serviceIDCounter++
	return fmt.Sprintf("seed-svc-%d-%s", serviceIDCounter, categoryID[len(categoryID)-4:])
}

func main() {
	dbURL := flag.String("db", "", "Database URL (e.g., file:./dev.db)")
	flag.Parse()

	// Load from .env if not provided
	if *dbURL == "" {
		*dbURL = getEnvOrDefault("DATABASE_URL", "file:./dev.db")
	}

	dbPath := strings.TrimPrefix(*dbURL, "file:")
	if !strings.Contains(dbPath, "/") {
		dbPath = "./" + dbPath
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to open database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to connect to database: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Connected to: %s\n", dbPath)

	categories := []Category{
		{ID: "seed-cat-dev", Name: "开发工具", Icon: "lucide:code", Color: "#4f46e5"},
		{ID: "seed-cat-ops", Name: "运维工具", Icon: "lucide:server", Color: "#059669"},
		{ID: "seed-cat-doc", Name: "文档资源", Icon: "lucide:book-open", Color: "#dc2626"},
	}

	services := []Service{
		{CategoryID: "seed-cat-dev", Name: "GitHub", URL: "https://github.com", Description: "GitHub 代码托管平台", Icon: "si:github", Color: "#333333"},
		{CategoryID: "seed-cat-dev", Name: "GitLab", URL: "https://gitlab.com", Description: "GitLab 代码托管平台", Icon: "si:gitlab", Color: "#fc6d26"},
		{CategoryID: "seed-cat-ops", Name: "Grafana", URL: "https://grafana.com", Description: "开源可观测性平台", Icon: "si:grafana", Color: "#f46800"},
		{CategoryID: "seed-cat-ops", Name: "Prometheus", URL: "https://prometheus.io", Description: "监控系统", Icon: "si:prometheus", Color: "#e6522c"},
		{CategoryID: "seed-cat-doc", Name: "MDN", URL: "https://developer.mozilla.org", Description: "MDN Web 文档", Icon: "lucide:globe", Color: "#4f46e5"},
		{CategoryID: "seed-cat-doc", Name: "Docker Docs", URL: "https://docs.docker.com", Description: "Docker 官方文档", Icon: "si:docker", Color: "#2496ed"},
	}

	// Insert categories
	fmt.Println("\n--- Categories ---")
	for _, cat := range categories {
		exists, name := categoryExists(db, cat.Name)
		if exists {
			fmt.Printf("  [skip] Category '%s' already exists\n", name)
		} else {
			_, err := db.Exec(`INSERT INTO Category (id, name, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
				cat.ID, cat.Name, cat.Icon, cat.Color)
			if err != nil {
				fmt.Fprintf(os.Stderr, "  [error] Failed to insert category '%s': %v\n", cat.Name, err)
			} else {
				fmt.Printf("  [insert] Category '%s' created\n", cat.Name)
			}
		}
	}

	// Insert services
	fmt.Println("\n--- Services ---")
	for _, svc := range services {
		exists, name := serviceExists(db, svc.Name, svc.CategoryID)
		if exists {
			fmt.Printf("  [skip] Service '%s' already exists\n", name)
		} else {
			_, err := db.Exec(`INSERT INTO Service (id, name, categoryId, url, description, icon, color, "order", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
				nextServiceID(svc.CategoryID), svc.Name, svc.CategoryID, svc.URL, svc.Description, svc.Icon, svc.Color)
			if err != nil {
				fmt.Fprintf(os.Stderr, "  [error] Failed to insert service '%s': %v\n", svc.Name, err)
			} else {
				fmt.Printf("  [insert] Service '%s' created\n", svc.Name)
			}
		}
	}

	fmt.Println("\nDone.")
}

func categoryExists(db *sql.DB, name string) (bool, string) {
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM Category WHERE name = ?`, name).Scan(&count)
	if err != nil {
		return false, ""
	}
	return count > 0, name
}

func serviceExists(db *sql.DB, name, categoryID string) (bool, string) {
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM Service WHERE name = ? AND categoryId = ?`, name, categoryID).Scan(&count)
	if err != nil {
		return false, ""
	}
	return count > 0, name
}

func getEnvOrDefault(key, defaultVal string) string {
	// Try to load from .env file
	if data, err := os.ReadFile(".env"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, key+"=") {
				val := strings.TrimPrefix(line, key+"=")
				val = strings.Trim(val, `"'`)
				return val
			}
		}
	}
	return defaultVal
}