package controllers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/frallan97/ticket-system/backend/config"
	"github.com/frallan97/ticket-system/backend/database"
	"github.com/frallan97/ticket-system/backend/middleware"
	"github.com/frallan97/ticket-system/backend/models"
	"github.com/frallan97/ticket-system/backend/services"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// GetEvents returns a list of published events
func GetEvents(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT id, organizer_id, title, description, venue_name, venue_address,
			   event_date, doors_open, has_seating, image_url, status, max_capacity,
			   created_at, updated_at
		FROM events
		WHERE status = 'published'
		ORDER BY event_date ASC
	`

	rows, err := database.DB.Query(query)
	if err != nil {
		http.Error(w, "Failed to fetch events", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	events := []models.Event{}
	for rows.Next() {
		var event models.Event
		err := rows.Scan(
			&event.ID, &event.OrganizerID, &event.Title, &event.Description,
			&event.VenueName, &event.VenueAddress, &event.EventDate, &event.DoorsOpen,
			&event.HasSeating, &event.ImageURL, &event.Status, &event.MaxCapacity,
			&event.CreatedAt, &event.UpdatedAt,
		)
		if err != nil {
			continue
		}
		events = append(events, event)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// GetEventByID returns a single event by ID
func GetEventByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	query := `
		SELECT id, organizer_id, title, description, venue_name, venue_address,
			   event_date, doors_open, has_seating, image_url, status, max_capacity,
			   created_at, updated_at
		FROM events
		WHERE id = $1
	`

	var event models.Event
	err = database.DB.QueryRow(query, eventID).Scan(
		&event.ID, &event.OrganizerID, &event.Title, &event.Description,
		&event.VenueName, &event.VenueAddress, &event.EventDate, &event.DoorsOpen,
		&event.HasSeating, &event.ImageURL, &event.Status, &event.MaxCapacity,
		&event.CreatedAt, &event.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to fetch event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(event)
}

// CreateEvent creates a new event
func CreateEvent(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	var req models.CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validation
	if req.Title == "" || req.VenueName == "" {
		http.Error(w, "Title and venue name are required", http.StatusBadRequest)
		return
	}

	query := `
		INSERT INTO events (organizer_id, title, description, venue_name, venue_address,
							event_date, doors_open, has_seating, max_capacity)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`

	var eventID int
	err := database.DB.QueryRow(
		query, userID, req.Title, req.Description, req.VenueName, req.VenueAddress,
		req.EventDate, req.DoorsOpen, req.HasSeating, req.MaxCapacity,
	).Scan(&eventID)

	if err != nil {
		http.Error(w, "Failed to create event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int{"id": eventID})
}

// UpdateEvent updates an existing event
func UpdateEvent(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Check ownership
	var organizerID uuid.UUID
	err = database.DB.QueryRow("SELECT organizer_id FROM events WHERE id = $1", eventID).Scan(&organizerID)
	if err == sql.ErrNoRows {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to verify ownership", http.StatusInternalServerError)
		return
	}

	if organizerID != userID {
		http.Error(w, "You don't have permission to update this event", http.StatusForbidden)
		return
	}

	var req models.UpdateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	query := "UPDATE events SET updated_at = NOW()"
	args := []interface{}{}
	argCount := 1

	if req.Title != nil {
		query += ", title = $" + strconv.Itoa(argCount)
		args = append(args, *req.Title)
		argCount++
	}
	if req.Description != nil {
		query += ", description = $" + strconv.Itoa(argCount)
		args = append(args, *req.Description)
		argCount++
	}
	if req.VenueName != nil {
		query += ", venue_name = $" + strconv.Itoa(argCount)
		args = append(args, *req.VenueName)
		argCount++
	}
	if req.VenueAddress != nil {
		query += ", venue_address = $" + strconv.Itoa(argCount)
		args = append(args, *req.VenueAddress)
		argCount++
	}
	if req.EventDate != nil {
		query += ", event_date = $" + strconv.Itoa(argCount)
		args = append(args, *req.EventDate)
		argCount++
	}
	if req.DoorsOpen != nil {
		query += ", doors_open = $" + strconv.Itoa(argCount)
		args = append(args, *req.DoorsOpen)
		argCount++
	}
	if req.HasSeating != nil {
		query += ", has_seating = $" + strconv.Itoa(argCount)
		args = append(args, *req.HasSeating)
		argCount++
	}
	if req.Status != nil {
		query += ", status = $" + strconv.Itoa(argCount)
		args = append(args, *req.Status)
		argCount++
	}
	if req.MaxCapacity != nil {
		query += ", max_capacity = $" + strconv.Itoa(argCount)
		args = append(args, *req.MaxCapacity)
		argCount++
	}

	query += " WHERE id = $" + strconv.Itoa(argCount)
	args = append(args, eventID)

	_, err = database.DB.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Event updated successfully"})
}

// DeleteEvent deletes an event
func DeleteEvent(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Check ownership and get image URL
	var organizerID uuid.UUID
	var imageURL sql.NullString
	err = database.DB.QueryRow("SELECT organizer_id, image_url FROM events WHERE id = $1", eventID).Scan(&organizerID, &imageURL)
	if err == sql.ErrNoRows {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to verify ownership", http.StatusInternalServerError)
		return
	}

	if organizerID != userID {
		http.Error(w, "You don't have permission to delete this event", http.StatusForbidden)
		return
	}

	// Delete image from MinIO if exists
	cfg := r.Context().Value("config").(*config.Config)
	if imageURL.Valid && imageURL.String != "" {
		if err := services.DeleteEventImage(r.Context(), cfg, imageURL.String); err != nil {
			// Log error but don't fail the deletion
			http.Error(w, "Warning: Failed to delete event image", http.StatusInternalServerError)
		}
	}

	_, err = database.DB.Exec("DELETE FROM events WHERE id = $1", eventID)
	if err != nil {
		http.Error(w, "Failed to delete event", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// UploadEventImage uploads an image for an event
func UploadEventImage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Check ownership and get current image URL
	var organizerID uuid.UUID
	var oldImageURL sql.NullString
	err = database.DB.QueryRow("SELECT organizer_id, image_url FROM events WHERE id = $1", eventID).Scan(&organizerID, &oldImageURL)
	if err == sql.ErrNoRows {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to verify ownership", http.StatusInternalServerError)
		return
	}

	if organizerID != userID {
		http.Error(w, "You don't have permission to upload image for this event", http.StatusForbidden)
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Failed to get image from request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get config from context
	cfg := r.Context().Value("config").(*config.Config)

	// Upload new image to MinIO
	imageURL, err := services.UploadEventImage(context.Background(), cfg, file, header)
	if err != nil {
		http.Error(w, "Failed to upload image: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete old image if exists
	if oldImageURL.Valid && oldImageURL.String != "" {
		if err := services.DeleteEventImage(context.Background(), cfg, oldImageURL.String); err != nil {
			// Log but don't fail - old image cleanup is not critical
		}
	}

	// Update event with new image URL
	_, err = database.DB.Exec("UPDATE events SET image_url = $1, updated_at = NOW() WHERE id = $2", imageURL, eventID)
	if err != nil {
		http.Error(w, "Failed to update event with image URL", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"image_url": imageURL})
}

// GetEventAnalytics returns comprehensive analytics for an event
func GetEventAnalytics(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Check ownership
	var organizerID uuid.UUID
	err = database.DB.QueryRow("SELECT organizer_id FROM events WHERE id = $1", eventID).Scan(&organizerID)
	if err == sql.ErrNoRows {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to verify ownership", http.StatusInternalServerError)
		return
	}

	if organizerID != userID {
		http.Error(w, "You don't have permission to view analytics for this event", http.StatusForbidden)
		return
	}

	// Get analytics
	analytics, err := services.GetEventAnalytics(r.Context(), eventID)
	if err != nil {
		http.Error(w, "Failed to get event analytics: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

// GetEventBookings returns all bookings for an event (organizer view)
func GetEventBookings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Check ownership
	var organizerID uuid.UUID
	err = database.DB.QueryRow("SELECT organizer_id FROM events WHERE id = $1", eventID).Scan(&organizerID)
	if err == sql.ErrNoRows {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to verify ownership", http.StatusInternalServerError)
		return
	}

	if organizerID != userID {
		http.Error(w, "You don't have permission to view bookings for this event", http.StatusForbidden)
		return
	}

	// Get bookings
	bookings, err := services.GetEventBookings(r.Context(), eventID)
	if err != nil {
		http.Error(w, "Failed to get event bookings: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookings)
}
