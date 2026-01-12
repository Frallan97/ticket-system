package models

import (
	"time"

	"github.com/google/uuid"
)

// EventAnalytics represents comprehensive analytics for an event
type EventAnalytics struct {
	EventID             int                     `json:"event_id"`
	TotalBookings       int                     `json:"total_bookings"`
	TotalTicketsSold    int                     `json:"total_tickets_sold"`
	TotalRevenue        float64                 `json:"total_revenue"`
	CheckedInCount      int                     `json:"checked_in_count"`
	CheckInRate         float64                 `json:"check_in_rate"`
	TicketTypeBreakdown []TicketTypeAnalytics   `json:"ticket_type_breakdown"`
	SalesOverTime       []SalesAnalytics        `json:"sales_over_time"`
}

// TicketTypeAnalytics represents sales breakdown by ticket type
type TicketTypeAnalytics struct {
	TypeName string  `json:"type_name"`
	Sold     int     `json:"sold"`
	Revenue  float64 `json:"revenue"`
}

// SalesAnalytics represents sales data for a specific date
type SalesAnalytics struct {
	Date     time.Time `json:"date"`
	Bookings int       `json:"bookings"`
	Tickets  int       `json:"tickets"`
	Revenue  float64   `json:"revenue"`
}

// CheckinStatusResponse represents check-in status for an event
type CheckinStatusResponse struct {
	EventID         int             `json:"event_id"`
	TotalTickets    int             `json:"total_tickets"`
	CheckedInCount  int             `json:"checked_in_count"`
	PendingCount    int             `json:"pending_count"`
	CheckInRate     float64         `json:"check_in_rate"`
	RecentCheckIns  []RecentCheckIn `json:"recent_check_ins"`
}

// RecentCheckIn represents a recent check-in event
type RecentCheckIn struct {
	TicketCode   string     `json:"ticket_code"`
	CheckedInAt  *time.Time `json:"checked_in_at"`
	AttendeeName string     `json:"attendee_name"`
}

// BookingWithTickets represents a booking with ticket count
type BookingWithTickets struct {
	ID              int       `json:"id"`
	CustomerID      uuid.UUID `json:"customer_id"`
	BookingReference string   `json:"booking_reference"`
	TotalAmount     float64   `json:"total_amount"`
	Status          string    `json:"status"`
	PaymentStatus   string    `json:"payment_status"`
	CustomerEmail   string    `json:"customer_email"`
	CustomerName    string    `json:"customer_name"`
	CustomerPhone   *string   `json:"customer_phone,omitempty"`
	BookingDate     time.Time `json:"booking_date"`
	CreatedAt       time.Time `json:"created_at"`
	TicketCount     int       `json:"ticket_count"`
}
