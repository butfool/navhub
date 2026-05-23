package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/lucsky/cuid"
	"navhub/internal/model"
	"navhub/internal/store"
	"navhub/internal/validate"
)

type Handler struct {
	db *store.DB
}

func New(db *store.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) error(w http.ResponseWriter, status int, message string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func (h *Handler) success(w http.ResponseWriter, status int, data interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Categories

func (h *Handler) GetCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.db.GetCategories()
	if err != nil {
		h.error(w, http.StatusInternalServerError, "Failed to fetch categories")
		return
	}
	if categories == nil {
		categories = []model.Category{}
	}
	h.success(w, http.StatusOK, categories)
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name  string `json:"name"`
		Icon  string `json:"icon"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		h.error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if !validate.CategoryName(input.Name) {
		h.error(w, http.StatusBadRequest, "Name is required")
		return
	}

	now := time.Now()
	category := &model.Category{
		ID:        cuid.New(),
		Name:      input.Name,
		Icon:      input.Icon,
		Color:     input.Color,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := h.db.CreateCategory(category); err != nil {
		if err == store.ErrAlreadyExists {
			h.error(w, http.StatusConflict, "Record already exists")
			return
		}
		h.error(w, http.StatusInternalServerError, "Failed to create category")
		return
	}

	h.success(w, http.StatusCreated, category)
}

func (h *Handler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		h.error(w, http.StatusBadRequest, "Missing id parameter")
		return
	}

	var input struct {
		Name  *string `json:"name,omitempty"`
		Icon  *string `json:"icon,omitempty"`
		Color *string `json:"color,omitempty"`
		Order *int    `json:"order,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		h.error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	existing, err := h.db.GetCategoryByID(id)
	if err != nil {
		if err == store.ErrNotFound {
			h.error(w, http.StatusNotFound, "Related record not found")
			return
		}
		h.error(w, http.StatusInternalServerError, "Failed to fetch category")
		return
	}

	if input.Name != nil {
		if !validate.CategoryName(*input.Name) {
			h.error(w, http.StatusBadRequest, "Name is required")
			return
		}
		existing.Name = *input.Name
	}
	if input.Icon != nil {
		existing.Icon = *input.Icon
	}
	if input.Color != nil {
		existing.Color = *input.Color
	}
	if input.Order != nil {
		existing.Order = *input.Order
	}
	existing.UpdatedAt = time.Now()

	if err := h.db.UpdateCategory(existing); err != nil {
		if err == store.ErrAlreadyExists {
			h.error(w, http.StatusConflict, "Record already exists")
			return
		}
		if err == store.ErrNotFound {
			h.error(w, http.StatusNotFound, "Related record not found")
			return
		}
		h.error(w, http.StatusInternalServerError, "Failed to update category")
		return
	}

	h.success(w, http.StatusOK, existing)
}

func (h *Handler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		h.error(w, http.StatusBadRequest, "Missing id parameter")
		return
	}

	if err := h.db.DeleteCategory(id); err != nil {
		if err == store.ErrNotFound {
			h.error(w, http.StatusNotFound, "Related record not found")
			return
		}
		h.error(w, http.StatusInternalServerError, "Failed to delete category")
		return
	}

	h.success(w, http.StatusOK, map[string]bool{"success": true})
}