package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Cart represents a shopping cart
type Cart struct {
	ID        int        `json:"id"`
	UserID    *uuid.UUID `json:"user_id,omitempty"`
	SessionID string     `json:"session_id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	ExpiresAt time.Time  `json:"expires_at"`
}

// CartItem represents an item in the shopping cart
type CartItem struct {
	ID           int           `json:"id"`
	CartID       int           `json:"cart_id"`
	EventID      int           `json:"event_id"`
	TicketTypeID int           `json:"ticket_type_id"`
	Quantity     int           `json:"quantity"`
	SeatIDs      pq.Int64Array `json:"seat_ids" db:"seat_ids"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}

// AddToCartRequest represents the request to add items to cart
type AddToCartRequest struct {
	EventID      int   `json:"event_id" binding:"required"`
	TicketTypeID int   `json:"ticket_type_id" binding:"required"`
	Quantity     int   `json:"quantity" binding:"required,min=1"`
	SeatIDs      []int `json:"seat_ids,omitempty"`
}

// UpdateCartItemRequest represents the request to update cart item quantity
type UpdateCartItemRequest struct {
	Quantity int `json:"quantity" binding:"required,min=1"`
}

// CartItemDetail represents an enriched cart item with event and pricing details
type CartItemDetail struct {
	ID             int       `json:"id"`
	CartID         int       `json:"cart_id"`
	EventID        int       `json:"event_id"`
	EventTitle     string    `json:"event_title"`
	EventDate      time.Time `json:"event_date"`
	VenueName      string    `json:"venue_name"`
	TicketTypeID   int       `json:"ticket_type_id"`
	TicketTypeName string    `json:"ticket_type_name"`
	Price          float64   `json:"price"`
	Quantity       int       `json:"quantity"`
	Subtotal       float64   `json:"subtotal"`
	SeatIDs        []int     `json:"seat_ids,omitempty"`
	SeatDetails    []SeatDetail `json:"seat_details,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// SeatDetail represents seat information for display
type SeatDetail struct {
	SeatID     int    `json:"seat_id"`
	Section    string `json:"section"`
	RowLabel   string `json:"row_label"`
	SeatNumber string `json:"seat_number"`
}

// CartResponse represents the complete cart with enriched items
type CartResponse struct {
	ID         int              `json:"id"`
	SessionID  string           `json:"session_id"`
	Items      []CartItemDetail `json:"items"`
	TotalItems int              `json:"total_items"`
	TotalPrice float64          `json:"total_price"`
	ExpiresAt  time.Time        `json:"expires_at"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
}

// MergeCartRequest represents the request to merge guest cart with user cart
type MergeCartRequest struct {
	GuestSessionID string `json:"guest_session_id" binding:"required"`
}
