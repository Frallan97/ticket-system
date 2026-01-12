package models

import (
	"time"

	"github.com/google/uuid"
)

// Event represents an event (concert, cinema, etc.)
type Event struct {
	ID           int        `json:"id"`
	OrganizerID  uuid.UUID  `json:"organizer_id"`
	Title        string     `json:"title"`
	Description  *string    `json:"description,omitempty"`
	VenueName    string     `json:"venue_name"`
	VenueAddress *string    `json:"venue_address,omitempty"`
	EventDate    time.Time  `json:"event_date"`
	DoorsOpen    *time.Time `json:"doors_open,omitempty"`
	HasSeating   bool       `json:"has_seating"`
	ImageURL     *string    `json:"image_url,omitempty"`
	Status       string     `json:"status"`
	MaxCapacity  *int       `json:"max_capacity,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// CreateEventRequest represents the request body for creating an event
type CreateEventRequest struct {
	Title        string     `json:"title"`
	Description  *string    `json:"description,omitempty"`
	VenueName    string     `json:"venue_name"`
	VenueAddress *string    `json:"venue_address,omitempty"`
	EventDate    time.Time  `json:"event_date"`
	DoorsOpen    *time.Time `json:"doors_open,omitempty"`
	HasSeating   bool       `json:"has_seating"`
	MaxCapacity  *int       `json:"max_capacity,omitempty"`
}

// UpdateEventRequest represents the request body for updating an event
type UpdateEventRequest struct {
	Title        *string    `json:"title,omitempty"`
	Description  *string    `json:"description,omitempty"`
	VenueName    *string    `json:"venue_name,omitempty"`
	VenueAddress *string    `json:"venue_address,omitempty"`
	EventDate    *time.Time `json:"event_date,omitempty"`
	DoorsOpen    *time.Time `json:"doors_open,omitempty"`
	HasSeating   *bool      `json:"has_seating,omitempty"`
	Status       *string    `json:"status,omitempty"`
	MaxCapacity  *int       `json:"max_capacity,omitempty"`
}
