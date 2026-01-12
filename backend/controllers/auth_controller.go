package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/frallan97/ticket-system/backend/middleware"
)

// GetCurrentUser returns the authenticated user's information
func GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "User ID not found", http.StatusUnauthorized)
		return
	}

	email, _ := middleware.GetEmail(r.Context())
	name, _ := middleware.GetName(r.Context())

	response := map[string]interface{}{
		"id":    userID,
		"email": email,
		"name":  name,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RefreshToken handles token refresh (placeholder for now)
func RefreshToken(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement token refresh logic
	// For now, return a placeholder message
	http.Error(w, "Token refresh not implemented yet", http.StatusNotImplemented)
}

// Logout handles user logout (placeholder for now)
func Logout(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement logout logic (invalidate refresh tokens)
	// For now, return success
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Logged out successfully",
	})
}
