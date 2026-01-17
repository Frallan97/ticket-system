package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/frallan97/ticket-system/backend/middleware"
	"github.com/frallan97/ticket-system/backend/models"
	"github.com/frallan97/ticket-system/backend/services"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// getCartSessionID extracts or generates a cart session ID from request
func getCartSessionID(r *http.Request) string {
	// Try to get session ID from header
	sessionID := r.Header.Get("X-Cart-Session")
	if sessionID != "" {
		return sessionID
	}

	// Generate new session ID if not provided
	return uuid.New().String()
}

// AddToCart adds items to the shopping cart
func AddToCart(w http.ResponseWriter, r *http.Request) {
	sessionID := getCartSessionID(r)

	// Get user ID if authenticated (optional)
	var userIDPtr *uuid.UUID
	if userID, ok := middleware.GetUserID(r.Context()); ok {
		userIDPtr = &userID
	}

	var req models.AddToCartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validation
	if req.EventID == 0 || req.TicketTypeID == 0 || req.Quantity < 1 {
		http.Error(w, "Event ID, ticket type ID, and quantity (min 1) are required", http.StatusBadRequest)
		return
	}

	// Add to cart
	item, err := services.AddToCart(r.Context(), sessionID, userIDPtr, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cart-Session", sessionID) // Return session ID for client to store
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

// GetCart retrieves the current cart with all items
func GetCart(w http.ResponseWriter, r *http.Request) {
	sessionID := getCartSessionID(r)

	cart, err := services.GetCart(r.Context(), sessionID)
	if err != nil {
		http.Error(w, "Failed to retrieve cart", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cart-Session", sessionID)
	json.NewEncoder(w).Encode(cart)
}

// UpdateCartItem updates the quantity of a cart item
func UpdateCartItem(w http.ResponseWriter, r *http.Request) {
	sessionID := getCartSessionID(r)

	vars := mux.Vars(r)
	itemID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateCartItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Quantity < 1 {
		http.Error(w, "Quantity must be at least 1", http.StatusBadRequest)
		return
	}

	err = services.UpdateCartItem(r.Context(), sessionID, itemID, req.Quantity)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// RemoveCartItem removes an item from the cart
func RemoveCartItem(w http.ResponseWriter, r *http.Request) {
	sessionID := getCartSessionID(r)

	vars := mux.Vars(r)
	itemID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}

	err = services.RemoveCartItem(r.Context(), sessionID, itemID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ClearCart removes all items from the cart
func ClearCart(w http.ResponseWriter, r *http.Request) {
	sessionID := getCartSessionID(r)

	err := services.ClearCart(r.Context(), sessionID)
	if err != nil {
		http.Error(w, "Failed to clear cart", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// MergeGuestCart migrates a guest cart to an authenticated user's cart
func MergeGuestCart(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req models.MergeCartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.GuestSessionID == "" {
		http.Error(w, "Guest session ID is required", http.StatusBadRequest)
		return
	}

	// Get or generate the authenticated user's session ID
	userSessionID := getCartSessionID(r)

	err := services.MergeGuestCart(r.Context(), req.GuestSessionID, userID, userSessionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Return the merged cart
	cart, err := services.GetCart(r.Context(), userSessionID)
	if err != nil {
		http.Error(w, "Failed to retrieve merged cart", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cart-Session", userSessionID)
	json.NewEncoder(w).Encode(cart)
}
