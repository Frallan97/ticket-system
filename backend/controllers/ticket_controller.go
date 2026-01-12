package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/frallan97/ticket-system/backend/middleware"
	"github.com/frallan97/ticket-system/backend/services"
	"github.com/gorilla/mux"
)

// GetTicketQRCode generates and returns a QR code image for a ticket
func GetTicketQRCode(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ticketCode := vars["code"]

	if ticketCode == "" {
		http.Error(w, "Ticket code is required", http.StatusBadRequest)
		return
	}

	// Generate QR code image
	pngBytes, err := services.GenerateQRCodeImage(ticketCode)
	if err != nil {
		http.Error(w, "Failed to generate QR code", http.StatusInternalServerError)
		return
	}

	// Return PNG image
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Content-Length", strconv.Itoa(len(pngBytes)))
	w.Write(pngBytes)
}

// ValidateTicket validates a ticket QR code
func ValidateTicket(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ticketCode := vars["code"]

	if ticketCode == "" {
		http.Error(w, "Ticket code is required", http.StatusBadRequest)
		return
	}

	// Validate ticket
	ticketDetail, err := services.ValidateTicketCode(r.Context(), ticketCode)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ticketDetail)
}

// CheckInTicket marks a ticket as checked in
func CheckInTicket(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	ticketCode := vars["code"]

	if ticketCode == "" {
		http.Error(w, "Ticket code is required", http.StatusBadRequest)
		return
	}

	// Check in ticket
	err := services.CheckInTicket(r.Context(), ticketCode, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Ticket checked in successfully",
		"ticket_code": ticketCode,
	})
}

// GetCheckinStatus returns check-in statistics for an event
func GetCheckinStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Get stats
	stats, err := services.GetCheckinStats(r.Context(), eventID)
	if err != nil {
		http.Error(w, "Failed to get check-in statistics", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
