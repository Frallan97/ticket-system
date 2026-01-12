package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/frallan97/ticket-system/backend/middleware"
	"github.com/frallan97/ticket-system/backend/models"
	"github.com/frallan97/ticket-system/backend/services"
	"github.com/gorilla/mux"
)

// CreateBooking creates a new booking with tickets
func CreateBooking(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	var req models.CreateBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validation
	if req.EventID == 0 || req.CustomerEmail == "" || req.CustomerName == "" {
		http.Error(w, "Event ID, email, and name are required", http.StatusBadRequest)
		return
	}

	if len(req.Items) == 0 {
		http.Error(w, "At least one booking item is required", http.StatusBadRequest)
		return
	}

	// Create booking
	booking, err := services.CreateBooking(r.Context(), userID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(booking)
}

// GetBookings returns all bookings for the authenticated user
func GetBookings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	bookings, err := services.GetCustomerBookings(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to fetch bookings", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookings)
}

// GetBookingByID returns a single booking with tickets
func GetBookingByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	bookingID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid booking ID", http.StatusBadRequest)
		return
	}

	booking, err := services.GetBookingByID(r.Context(), bookingID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(booking)
}

// GetBookingTickets returns all tickets for a booking
func GetBookingTickets(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	bookingID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid booking ID", http.StatusBadRequest)
		return
	}

	booking, err := services.GetBookingByID(r.Context(), bookingID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(booking.Tickets)
}
