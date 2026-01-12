package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/frallan97/ticket-system/backend/database"
	"github.com/frallan97/ticket-system/backend/middleware"
	"github.com/frallan97/ticket-system/backend/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// GetTicketTypes returns all ticket types for an event
func GetTicketTypes(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	query := `
		SELECT id, event_id, name, description, price, quantity_available, quantity_sold,
			   sale_start_date, sale_end_date, is_active, created_at, updated_at
		FROM ticket_types
		WHERE event_id = $1 AND is_active = TRUE
		ORDER BY price ASC
	`

	rows, err := database.DB.Query(query, eventID)
	if err != nil {
		http.Error(w, "Failed to fetch ticket types", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	ticketTypes := []models.TicketType{}
	for rows.Next() {
		var tt models.TicketType
		err := rows.Scan(
			&tt.ID, &tt.EventID, &tt.Name, &tt.Description, &tt.Price,
			&tt.QuantityAvailable, &tt.QuantitySold, &tt.SaleStartDate,
			&tt.SaleEndDate, &tt.IsActive, &tt.CreatedAt, &tt.UpdatedAt,
		)
		if err != nil {
			continue
		}
		ticketTypes = append(ticketTypes, tt)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ticketTypes)
}

// CreateTicketType creates a new ticket type for an event
func CreateTicketType(w http.ResponseWriter, r *http.Request) {
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
		http.Error(w, "You don't have permission to add ticket types to this event", http.StatusForbidden)
		return
	}

	var req models.CreateTicketTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validation
	if req.Name == "" || req.Price < 0 || req.QuantityAvailable < 0 {
		http.Error(w, "Name, price, and quantity must be valid", http.StatusBadRequest)
		return
	}

	query := `
		INSERT INTO ticket_types (event_id, name, description, price, quantity_available,
								  sale_start_date, sale_end_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`

	var ticketTypeID int
	err = database.DB.QueryRow(
		query, eventID, req.Name, req.Description, req.Price, req.QuantityAvailable,
		req.SaleStartDate, req.SaleEndDate,
	).Scan(&ticketTypeID)

	if err != nil {
		http.Error(w, "Failed to create ticket type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int{"id": ticketTypeID})
}

// UpdateTicketType updates an existing ticket type
func UpdateTicketType(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	ticketTypeID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ticket type ID", http.StatusBadRequest)
		return
	}

	// Verify ownership through event
	var organizerID uuid.UUID
	query := `
		SELECT e.organizer_id
		FROM ticket_types tt
		JOIN events e ON tt.event_id = e.id
		WHERE tt.id = $1
	`
	err = database.DB.QueryRow(query, ticketTypeID).Scan(&organizerID)
	if err == sql.ErrNoRows {
		http.Error(w, "Ticket type not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to verify ownership", http.StatusInternalServerError)
		return
	}

	if organizerID != userID {
		http.Error(w, "You don't have permission to update this ticket type", http.StatusForbidden)
		return
	}

	var req models.UpdateTicketTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	updateQuery := "UPDATE ticket_types SET updated_at = NOW()"
	args := []interface{}{}
	argCount := 1

	if req.Name != nil {
		updateQuery += ", name = $" + strconv.Itoa(argCount)
		args = append(args, *req.Name)
		argCount++
	}
	if req.Description != nil {
		updateQuery += ", description = $" + strconv.Itoa(argCount)
		args = append(args, *req.Description)
		argCount++
	}
	if req.Price != nil {
		updateQuery += ", price = $" + strconv.Itoa(argCount)
		args = append(args, *req.Price)
		argCount++
	}
	if req.QuantityAvailable != nil {
		updateQuery += ", quantity_available = $" + strconv.Itoa(argCount)
		args = append(args, *req.QuantityAvailable)
		argCount++
	}
	if req.SaleStartDate != nil {
		updateQuery += ", sale_start_date = $" + strconv.Itoa(argCount)
		args = append(args, *req.SaleStartDate)
		argCount++
	}
	if req.SaleEndDate != nil {
		updateQuery += ", sale_end_date = $" + strconv.Itoa(argCount)
		args = append(args, *req.SaleEndDate)
		argCount++
	}
	if req.IsActive != nil {
		updateQuery += ", is_active = $" + strconv.Itoa(argCount)
		args = append(args, *req.IsActive)
		argCount++
	}

	updateQuery += " WHERE id = $" + strconv.Itoa(argCount)
	args = append(args, ticketTypeID)

	_, err = database.DB.Exec(updateQuery, args...)
	if err != nil {
		http.Error(w, "Failed to update ticket type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Ticket type updated successfully"})
}

// DeleteTicketType deletes a ticket type
func DeleteTicketType(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	ticketTypeID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ticket type ID", http.StatusBadRequest)
		return
	}

	// Verify ownership through event
	var organizerID uuid.UUID
	query := `
		SELECT e.organizer_id
		FROM ticket_types tt
		JOIN events e ON tt.event_id = e.id
		WHERE tt.id = $1
	`
	err = database.DB.QueryRow(query, ticketTypeID).Scan(&organizerID)
	if err == sql.ErrNoRows {
		http.Error(w, "Ticket type not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to verify ownership", http.StatusInternalServerError)
		return
	}

	if organizerID != userID {
		http.Error(w, "You don't have permission to delete this ticket type", http.StatusForbidden)
		return
	}

	_, err = database.DB.Exec("DELETE FROM ticket_types WHERE id = $1", ticketTypeID)
	if err != nil {
		http.Error(w, "Failed to delete ticket type", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
