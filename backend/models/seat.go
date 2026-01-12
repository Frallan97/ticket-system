package models

import "time"

// Seat represents a physical seat at an event
type Seat struct {
	ID           int       `json:"id"`
	EventID      int       `json:"event_id"`
	Section      string    `json:"section"`
	RowLabel     string    `json:"row_label"`
	SeatNumber   string    `json:"seat_number"`
	TicketTypeID *int      `json:"ticket_type_id,omitempty"`
	IsAvailable  bool      `json:"is_available"`
	IsLocked     bool      `json:"is_locked"` // Computed field, not in DB
	CreatedAt    time.Time `json:"created_at"`
}

// SeatLock represents a temporary lock on a seat during checkout
type SeatLock struct {
	ID        int       `json:"id"`
	SeatID    int       `json:"seat_id"`
	SessionID string    `json:"session_id"`
	LockedAt  time.Time `json:"locked_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// BulkCreateSeatsRequest represents the request to create multiple seats
type BulkCreateSeatsRequest struct {
	Seats []CreateSeatRequest `json:"seats"`
}

// CreateSeatRequest represents a single seat to create
type CreateSeatRequest struct {
	Section      string `json:"section"`
	RowLabel     string `json:"row_label"`
	SeatNumber   string `json:"seat_number"`
	TicketTypeID *int   `json:"ticket_type_id,omitempty"`
}

// LockSeatsRequest represents the request to lock seats during checkout
type LockSeatsRequest struct {
	SeatIDs   []int  `json:"seat_ids"`
	SessionID string `json:"session_id"`
}

// LockSeatsResponse represents the response after locking seats
type LockSeatsResponse struct {
	SessionID string    `json:"session_id"`
	ExpiresAt time.Time `json:"expires_at"`
	LockedCount int     `json:"locked_count"`
}
