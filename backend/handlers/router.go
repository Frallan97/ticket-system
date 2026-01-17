package handlers

import (
	"context"
	"net/http"

	"github.com/casbin/casbin/v2"
	"github.com/frallan97/ticket-system/backend/config"
	"github.com/frallan97/ticket-system/backend/controllers"
	"github.com/frallan97/ticket-system/backend/middleware"
	"github.com/gorilla/mux"
)

// ConfigMiddleware adds config to request context
func ConfigMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), "config", cfg)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// SetupRouter configures all routes
// IMPORTANT: All routes include OPTIONS method for CORS preflight requests
func SetupRouter(cfg *config.Config, enforcer *casbin.Enforcer) http.Handler {
	r := mux.NewRouter()

	// Global middleware - CORS must be first!
	r.Use(middleware.CORS)
	r.Use(middleware.Logger)
	r.Use(middleware.Recovery)
	r.Use(ConfigMiddleware(cfg))

	// Root path handler
	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{
			"service": "Ticket System API",
			"version": "1.0.0",
			"status": "running",
			"endpoints": {
				"health": "/api/v1/health",
				"events": "/api/v1/events",
				"auth": "/api/v1/auth/me",
				"docs": "https://github.com/Frallan97/ticket-system"
			}
		}`))
	}).Methods("GET", "OPTIONS")

	// API v1 routes
	api := r.PathPrefix("/api/v1").Subrouter()

	// Public health check
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET", "OPTIONS")

	// Auth endpoints (public except /me)
	api.HandleFunc("/auth/refresh", controllers.RefreshToken).Methods("POST", "OPTIONS")
	api.HandleFunc("/auth/logout", controllers.Logout).Methods("POST", "OPTIONS")

	// Protected routes requiring authentication
	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.Auth(cfg.JWTPublicKey))

	// Auth /me endpoint (authenticated)
	protected.HandleFunc("/auth/me", controllers.GetCurrentUser).Methods("GET", "OPTIONS")

	// Protected + Authorized routes
	authorized := protected.PathPrefix("").Subrouter()
	authorized.Use(middleware.Authorize(enforcer))

	// Public event routes (browsing events and ticket types)
	api.HandleFunc("/events", controllers.GetEvents).Methods("GET", "OPTIONS")
	api.HandleFunc("/events/{id:[0-9]+}", controllers.GetEventByID).Methods("GET", "OPTIONS")
	api.HandleFunc("/events/{id:[0-9]+}/ticket-types", controllers.GetTicketTypes).Methods("GET", "OPTIONS")

	// Event management (organizer only)
	authorized.HandleFunc("/events", controllers.CreateEvent).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/events/{id:[0-9]+}", controllers.UpdateEvent).Methods("PATCH", "OPTIONS")
	authorized.HandleFunc("/events/{id:[0-9]+}", controllers.DeleteEvent).Methods("DELETE", "OPTIONS")
	authorized.HandleFunc("/events/{id:[0-9]+}/image", controllers.UploadEventImage).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/events/{id:[0-9]+}/analytics", controllers.GetEventAnalytics).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/events/{id:[0-9]+}/bookings", controllers.GetEventBookings).Methods("GET", "OPTIONS")

	// Ticket type management (organizer only)
	authorized.HandleFunc("/events/{id:[0-9]+}/ticket-types", controllers.CreateTicketType).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/ticket-types/{id:[0-9]+}", controllers.UpdateTicketType).Methods("PATCH", "OPTIONS")
	authorized.HandleFunc("/ticket-types/{id:[0-9]+}", controllers.DeleteTicketType).Methods("DELETE", "OPTIONS")

	// Seat routes
	api.HandleFunc("/events/{id:[0-9]+}/seats", controllers.GetSeats).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/events/{id:[0-9]+}/seats/bulk", controllers.BulkCreateSeats).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/bookings/lock-seats", controllers.LockSeats).Methods("POST", "OPTIONS")

	// Cart routes (accessible to both guests and authenticated users)
	api.HandleFunc("/cart", controllers.GetCart).Methods("GET", "OPTIONS")
	api.HandleFunc("/cart/items", controllers.AddToCart).Methods("POST", "OPTIONS")
	api.HandleFunc("/cart/items/{id:[0-9]+}", controllers.UpdateCartItem).Methods("PUT", "OPTIONS")
	api.HandleFunc("/cart/items/{id:[0-9]+}", controllers.RemoveCartItem).Methods("DELETE", "OPTIONS")
	api.HandleFunc("/cart", controllers.ClearCart).Methods("DELETE", "OPTIONS")
	// Cart merge requires authentication
	protected.HandleFunc("/cart/merge", controllers.MergeGuestCart).Methods("POST", "OPTIONS")

	// Booking routes (customer)
	authorized.HandleFunc("/bookings", controllers.CreateBooking).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/bookings", controllers.GetBookings).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/bookings/{id:[0-9]+}", controllers.GetBookingByID).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/bookings/{id:[0-9]+}/tickets", controllers.GetBookingTickets).Methods("GET", "OPTIONS")

	// Ticket routes
	authorized.HandleFunc("/tickets/{code}/qr", controllers.GetTicketQRCode).Methods("GET", "OPTIONS")
	authorized.HandleFunc("/tickets/{code}/validate", controllers.ValidateTicket).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/tickets/{code}/checkin", controllers.CheckInTicket).Methods("POST", "OPTIONS")
	authorized.HandleFunc("/events/{id:[0-9]+}/checkin-status", controllers.GetCheckinStatus).Methods("GET", "OPTIONS")

	return r
}
