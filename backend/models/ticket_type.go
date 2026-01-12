package models

import "time"

// TicketType represents a ticket pricing tier for an event
type TicketType struct {
	ID                int        `json:"id"`
	EventID           int        `json:"event_id"`
	Name              string     `json:"name"`
	Description       *string    `json:"description,omitempty"`
	Price             float64    `json:"price"`
	QuantityAvailable int        `json:"quantity_available"`
	QuantitySold      int        `json:"quantity_sold"`
	SaleStartDate     *time.Time `json:"sale_start_date,omitempty"`
	SaleEndDate       *time.Time `json:"sale_end_date,omitempty"`
	IsActive          bool       `json:"is_active"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// CreateTicketTypeRequest represents the request body for creating a ticket type
type CreateTicketTypeRequest struct {
	Name              string     `json:"name"`
	Description       *string    `json:"description,omitempty"`
	Price             float64    `json:"price"`
	QuantityAvailable int        `json:"quantity_available"`
	SaleStartDate     *time.Time `json:"sale_start_date,omitempty"`
	SaleEndDate       *time.Time `json:"sale_end_date,omitempty"`
}

// UpdateTicketTypeRequest represents the request body for updating a ticket type
type UpdateTicketTypeRequest struct {
	Name              *string    `json:"name,omitempty"`
	Description       *string    `json:"description,omitempty"`
	Price             *float64   `json:"price,omitempty"`
	QuantityAvailable *int       `json:"quantity_available,omitempty"`
	SaleStartDate     *time.Time `json:"sale_start_date,omitempty"`
	SaleEndDate       *time.Time `json:"sale_end_date,omitempty"`
	IsActive          *bool      `json:"is_active,omitempty"`
}
