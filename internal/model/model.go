package model

import "time"

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