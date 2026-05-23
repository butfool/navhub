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

func (h *Handler) GetServices(w http.ResponseWriter, r *http.Request) {
	services, err := h.db.GetServices()
	if err != nil {
		h.error(w, http.StatusInternalServerError, "Failed to fetch services")
		return
	}
	if services == nil {
		services = []model.Service{}
	}
	h.success(w, http.StatusOK, services)
}

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
		h.error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if !validate.ServiceName(input.Name) {
		h.error(w, http.StatusBadRequest, "Name is required")
		return
	}
	if !validate.URL(input.URL) {
		h.error(w, http.StatusBadRequest, "Invalid URL scheme")
		return
	}

	// Verify category exists
	_, err := h.db.GetCategoryByID(input.CategoryID)
	if err != nil {
		h.error(w, http.StatusNotFound, "Related record not found")
		return
	}

	now := time.Now()
	service := &model.Service{
		ID:          cuid.New(),
		Name:        input.Name,
		CategoryID:  input.CategoryID,
		URL:         input.URL,
		Description: input.Description,
		Icon:        input.Icon,
		Color:       input.Color,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.db.CreateService(service); err != nil {
		h.error(w, http.StatusInternalServerError, "Failed to create service")
		return
	}

	// Fetch category for response
	cat, _ := h.db.GetCategoryByID(service.CategoryID)
	service.Category = cat

	h.success(w, http.StatusCreated, service)
}

func (h *Handler) UpdateService(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		h.error(w, http.StatusBadRequest, "Missing id parameter")
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
		h.error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	existing, err := h.db.GetServiceByID(id)
	if err != nil {
		if err == store.ErrNotFound {
			h.error(w, http.StatusNotFound, "Related record not found")
			return
		}
		h.error(w, http.StatusInternalServerError, "Failed to fetch service")
		return
	}

	if input.Name != nil {
		if !validate.ServiceName(*input.Name) {
			h.error(w, http.StatusBadRequest, "Name is required")
			return
		}
		existing.Name = *input.Name
	}
	if input.CategoryID != nil {
		_, err := h.db.GetCategoryByID(*input.CategoryID)
		if err != nil {
			h.error(w, http.StatusNotFound, "Related record not found")
			return
		}
		existing.CategoryID = *input.CategoryID
	}
	if input.URL != nil {
		if !validate.URL(*input.URL) {
			h.error(w, http.StatusBadRequest, "Invalid URL scheme")
			return
		}
		existing.URL = *input.URL
	}
	if input.Description != nil {
		existing.Description = *input.Description
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

	if err := h.db.UpdateService(existing); err != nil {
		if err == store.ErrNotFound {
			h.error(w, http.StatusNotFound, "Related record not found")
			return
		}
		h.error(w, http.StatusInternalServerError, "Failed to update service")
		return
	}

	// Fetch category for response
	cat, _ := h.db.GetCategoryByID(existing.CategoryID)
	existing.Category = cat

	h.success(w, http.StatusOK, existing)
}

func (h *Handler) DeleteService(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		h.error(w, http.StatusBadRequest, "Missing id parameter")
		return
	}

	if err := h.db.DeleteService(id); err != nil {
		if err == store.ErrNotFound {
			h.error(w, http.StatusNotFound, "Related record not found")
			return
		}
		h.error(w, http.StatusInternalServerError, "Failed to delete service")
		return
	}

	h.success(w, http.StatusOK, map[string]bool{"success": true})
}