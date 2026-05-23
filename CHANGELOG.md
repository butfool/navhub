# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Refactored CI/CD workflows to follow best practices

## [0.1.0] - 2026-05-22

### Added
- Initial release
- Category management (CRUD, icons, colors, ordering)
- Service cards with URLs, descriptions, icons, and colors
- Drag-and-drop sorting for categories and services
- Dark, light, and system-aware themes
- REST API for category and service management
- SQLite persistence via Prisma and better-sqlite3
- Docker deployment with automatic database migrations