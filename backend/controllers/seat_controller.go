package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/frallan97/ticket-system/backend/database"
	"github.com/frallan97/ticket-system/backend/middleware"
	"github.com/frallan97/ticket-system/backend/models"
	"github.com/frallan97/ticket-system/backend/services"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// GetSeats returns all seats for an event with lock status
func GetSeats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Check if event exists
	var exists bool
	err = database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM events WHERE id = $1)", eventID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	seats, err := services.GetSeatsWithLockStatus(r.Context(), eventID)
	if err != nil {
		http.Error(w, "Failed to fetch seats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(seats)
}

// BulkCreateSeats creates multiple seats for an event (organizer only)
func BulkCreateSeats(w http.ResponseWriter, r *http.Request) {
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

	// Verify event ownership
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
		http.Error(w, "You don't have permission to add seats to this event", http.StatusForbidden)
		return
	}

	var req models.BulkCreateSeatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Seats) == 0 {
		http.Error(w, "No seats provided", http.StatusBadRequest)
		return
	}

	// Begin transaction
	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Failed to begin transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	insertQuery := `
		INSERT INTO seats (event_id, section, row_label, seat_number, ticket_type_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (event_id, section, row_label, seat_number) DO NOTHING
	`

	createdCount := 0
	for _, seat := range req.Seats {
		if seat.Section == "" || seat.RowLabel == "" || seat.SeatNumber == "" {
			continue
		}

		result, err := tx.Exec(insertQuery, eventID, seat.Section, seat.RowLabel, seat.SeatNumber, seat.TicketTypeID)
		if err != nil {
			http.Error(w, "Failed to create seats", http.StatusInternalServerError)
			return
		}

		affected, _ := result.RowsAffected()
		createdCount += int(affected)
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Seats created successfully",
		"created": createdCount,
		"total":   len(req.Seats),
	})
}

// LockSeats locks seats for checkout (customer)
func LockSeats(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	var req models.LockSeatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.SeatIDs) == 0 {
		http.Error(w, "No seats provided", http.StatusBadRequest)
		return
	}

	if req.SessionID == "" {
		http.Error(w, "Session ID is required", http.StatusBadRequest)
		return
	}

	response, err := services.LockSeats(r.Context(), req.SeatIDs, req.SessionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
