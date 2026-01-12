package models

import (
	"time"

	"github.com/google/uuid"
)

// Ticket represents an individual ticket for an event
type Ticket struct {
	ID            int        `json:"id"`
	BookingID     int        `json:"booking_id"`
	EventID       int        `json:"event_id"`
	TicketTypeID  int        `json:"ticket_type_id"`
	SeatID        *int       `json:"seat_id,omitempty"`
	TicketCode    string     `json:"ticket_code"`
	QRCodeData    string     `json:"qr_code_data"`
	PricePaid     float64    `json:"price_paid"`
	AttendeeName  *string    `json:"attendee_name,omitempty"`
	AttendeeEmail *string    `json:"attendee_email,omitempty"`
	IsCheckedIn   bool       `json:"is_checked_in"`
	CheckedInAt   *time.Time `json:"checked_in_at,omitempty"`
	CheckedInBy   *uuid.UUID `json:"checked_in_by,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// TicketDetailResponse includes ticket with related information
type TicketDetailResponse struct {
	Ticket
	EventTitle    string  `json:"event_title"`
	EventDate     time.Time `json:"event_date"`
	VenueName     string  `json:"venue_name"`
	TicketTypeName string `json:"ticket_type_name"`
	SeatInfo      *string `json:"seat_info,omitempty"` // e.g., "Section A, Row 5, Seat 12"
}
