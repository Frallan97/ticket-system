package models

import (
	"time"

	"github.com/google/uuid"
)

// Booking represents a customer's ticket purchase
type Booking struct {
	ID              int       `json:"id"`
	CustomerID      uuid.UUID `json:"customer_id"`
	EventID         int       `json:"event_id"`
	BookingReference string   `json:"booking_reference"`
	TotalAmount     float64   `json:"total_amount"`
	Status          string    `json:"status"`
	PaymentStatus   string    `json:"payment_status"`
	CustomerEmail   string    `json:"customer_email"`
	CustomerName    string    `json:"customer_name"`
	CustomerPhone   *string   `json:"customer_phone,omitempty"`
	BookingDate     time.Time `json:"booking_date"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// CreateBookingRequest represents the request to create a booking
type CreateBookingRequest struct {
	EventID       int                  `json:"event_id"`
	SessionID     string               `json:"session_id"` // For seat lock verification
	CustomerEmail string               `json:"customer_email"`
	CustomerName  string               `json:"customer_name"`
	CustomerPhone *string              `json:"customer_phone,omitempty"`
	Items         []BookingItemRequest `json:"items"`
}

// BookingItemRequest represents a single item in a booking
type BookingItemRequest struct {
	TicketTypeID int   `json:"ticket_type_id"`
	Quantity     int   `json:"quantity"`
	SeatIDs      []int `json:"seat_ids,omitempty"` // For events with seating
}

// BookingDetailResponse includes booking with tickets
type BookingDetailResponse struct {
	Booking
	Tickets []Ticket `json:"tickets"`
}
