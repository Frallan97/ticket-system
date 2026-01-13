package middleware

import (
	"net/http"

	"github.com/casbin/casbin/v2"
)

// Authorize is a middleware that checks authorization using Casbin
func Authorize(enforcer *casbin.Enforcer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get user ID from context (set by Auth middleware)
			_, ok := GetUserID(r.Context())
			if !ok {
				http.Error(w, "User not authenticated", http.StatusUnauthorized)
				return
			}

			// Determine user role based on is_super_admin flag
			// Super admins get "admin" role which inherits from "organizer" and "customer"
			// Regular users get "customer" role (can browse events and book tickets)
			role := "customer"
			if IsSuperAdmin(r.Context()) {
				role = "admin"
			}

			// Check authorization with Casbin
			// Subject: role from JWT ("admin" for super admins, "customer" for regular users)
			// Object: request path
			// Action: HTTP method
			allowed, err := enforcer.Enforce(role, r.URL.Path, r.Method)
			if err != nil {
				http.Error(w, "Authorization error", http.StatusInternalServerError)
				return
			}

			if !allowed {
				http.Error(w, "Forbidden: insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
