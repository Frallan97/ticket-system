package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/frallan97/ticket-system/backend/database"
	"github.com/frallan97/ticket-system/backend/models"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

const (
	CartExpirationHours = 24
	SeatLockMinutes     = 15
)

// GetOrCreateCart retrieves an existing cart or creates a new one
func GetOrCreateCart(ctx context.Context, userID *uuid.UUID, sessionID string) (*models.Cart, error) {
	var cart models.Cart

	// Try to find existing cart by session ID
	err := database.DB.QueryRowContext(ctx,
		`SELECT id, user_id, session_id, created_at, updated_at, expires_at
		 FROM carts
		 WHERE session_id = $1`,
		sessionID).Scan(&cart.ID, &cart.UserID, &cart.SessionID, &cart.CreatedAt, &cart.UpdatedAt, &cart.ExpiresAt)

	if err == sql.ErrNoRows {
		// Create new cart
		expiresAt := time.Now().Add(CartExpirationHours * time.Hour)
		err = database.DB.QueryRowContext(ctx,
			`INSERT INTO carts (user_id, session_id, expires_at)
			 VALUES ($1, $2, $3)
			 RETURNING id, user_id, session_id, created_at, updated_at, expires_at`,
			userID, sessionID, expiresAt).Scan(&cart.ID, &cart.UserID, &cart.SessionID, &cart.CreatedAt, &cart.UpdatedAt, &cart.ExpiresAt)

		if err != nil {
			return nil, fmt.Errorf("failed to create cart: %w", err)
		}
		return &cart, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to query cart: %w", err)
	}

	// Update user_id if authenticated and not already set
	if userID != nil && cart.UserID == nil {
		_, err = database.DB.ExecContext(ctx,
			`UPDATE carts SET user_id = $1, updated_at = NOW() WHERE id = $2`,
			userID, cart.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to update cart user: %w", err)
		}
		cart.UserID = userID
	}

	// Extend expiration
	expiresAt := time.Now().Add(CartExpirationHours * time.Hour)
	_, err = database.DB.ExecContext(ctx,
		`UPDATE carts SET expires_at = $1, updated_at = NOW() WHERE id = $2`,
		expiresAt, cart.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to update cart expiration: %w", err)
	}
	cart.ExpiresAt = expiresAt

	return &cart, nil
}

// AddToCart adds items to the cart with availability and seat lock validation
func AddToCart(ctx context.Context, sessionID string, userID *uuid.UUID, req models.AddToCartRequest) (*models.CartItemDetail, error) {
	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Verify event exists and is published
	var eventExists bool
	var hasSeating bool
	err = tx.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND status = 'published'),
		 (SELECT has_seating FROM events WHERE id = $1)`,
		req.EventID).Scan(&eventExists, &hasSeating)
	if err != nil || !eventExists {
		return nil, errors.New("event not found or not available")
	}

	// Verify ticket type exists and is available
	var price float64
	var quantityAvailable, quantitySold int
	err = tx.QueryRowContext(ctx,
		`SELECT price, quantity_available, quantity_sold
		 FROM ticket_types
		 WHERE id = $1 AND event_id = $2 AND is_active = TRUE`,
		req.TicketTypeID, req.EventID).Scan(&price, &quantityAvailable, &quantitySold)

	if err == sql.ErrNoRows {
		return nil, errors.New("ticket type not found")
	} else if err != nil {
		return nil, fmt.Errorf("failed to fetch ticket type: %w", err)
	}

	// Check availability (considering already sold + items in carts)
	var cartReservedCount int
	err = tx.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(quantity), 0)
		 FROM cart_items ci
		 JOIN carts c ON ci.cart_id = c.id
		 WHERE ci.ticket_type_id = $1 AND c.expires_at > NOW()`,
		req.TicketTypeID).Scan(&cartReservedCount)
	if err != nil {
		return nil, fmt.Errorf("failed to check cart reservations: %w", err)
	}

	availableQuantity := quantityAvailable - quantitySold - cartReservedCount
	if req.Quantity > availableQuantity {
		return nil, fmt.Errorf("insufficient tickets available (requested: %d, available: %d)", req.Quantity, availableQuantity)
	}

	// For assigned seating, validate and lock seats
	if hasSeating && len(req.SeatIDs) > 0 {
		if len(req.SeatIDs) != req.Quantity {
			return nil, errors.New("number of seats must match quantity for assigned seating")
		}

		// Verify seats are available
		var unavailableCount int
		err = tx.QueryRowContext(ctx,
			`SELECT COUNT(*)
			 FROM seats
			 WHERE id = ANY($1)
			 AND event_id = $2
			 AND (is_available = FALSE OR ticket_type_id != $3)`,
			pq.Array(req.SeatIDs), req.EventID, req.TicketTypeID).Scan(&unavailableCount)

		if err != nil {
			return nil, fmt.Errorf("failed to check seat availability: %w", err)
		}
		if unavailableCount > 0 {
			return nil, errors.New("one or more selected seats are not available")
		}

		// Check if seats are locked by another session
		var lockedByOther int
		err = tx.QueryRowContext(ctx,
			`SELECT COUNT(*)
			 FROM seat_locks
			 WHERE seat_id = ANY($1)
			 AND session_id != $2
			 AND expires_at > NOW()`,
			pq.Array(req.SeatIDs), sessionID).Scan(&lockedByOther)

		if err != nil {
			return nil, fmt.Errorf("failed to check seat locks: %w", err)
		}
		if lockedByOther > 0 {
			return nil, errors.New("one or more selected seats are currently locked by another user")
		}

		// Lock the seats
		lockExpiry := time.Now().Add(SeatLockMinutes * time.Minute)
		for _, seatID := range req.SeatIDs {
			_, err = tx.ExecContext(ctx,
				`INSERT INTO seat_locks (seat_id, session_id, expires_at)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (seat_id)
				 DO UPDATE SET session_id = $2, locked_at = NOW(), expires_at = $3`,
				seatID, sessionID, lockExpiry)
			if err != nil {
				return nil, fmt.Errorf("failed to lock seat %d: %w", seatID, err)
			}
		}
	}

	// Get or create cart
	cart, err := GetOrCreateCart(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	// Check if item already exists in cart
	var existingItemID *int
	var existingQuantity int
	var existingSeatIDs pq.Int64Array
	err = tx.QueryRowContext(ctx,
		`SELECT id, quantity, seat_ids
		 FROM cart_items
		 WHERE cart_id = $1 AND event_id = $2 AND ticket_type_id = $3`,
		cart.ID, req.EventID, req.TicketTypeID).Scan(&existingItemID, &existingQuantity, &existingSeatIDs)

	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check existing cart item: %w", err)
	}

	var itemID int
	if existingItemID != nil {
		// Update existing item
		newQuantity := existingQuantity + req.Quantity
		newSeatIDs := make([]int64, 0)
		for _, sid := range existingSeatIDs {
			newSeatIDs = append(newSeatIDs, sid)
		}
		for _, sid := range req.SeatIDs {
			newSeatIDs = append(newSeatIDs, int64(sid))
		}

		err = tx.QueryRowContext(ctx,
			`UPDATE cart_items
			 SET quantity = $1, seat_ids = $2, updated_at = NOW()
			 WHERE id = $3
			 RETURNING id`,
			newQuantity, pq.Array(newSeatIDs), *existingItemID).Scan(&itemID)
		if err != nil {
			return nil, fmt.Errorf("failed to update cart item: %w", err)
		}
	} else {
		// Insert new item
		seatIDsInt64 := make([]int64, len(req.SeatIDs))
		for i, sid := range req.SeatIDs {
			seatIDsInt64[i] = int64(sid)
		}

		err = tx.QueryRowContext(ctx,
			`INSERT INTO cart_items (cart_id, event_id, ticket_type_id, quantity, seat_ids)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id`,
			cart.ID, req.EventID, req.TicketTypeID, req.Quantity, pq.Array(seatIDsInt64)).Scan(&itemID)
		if err != nil {
			return nil, fmt.Errorf("failed to insert cart item: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Fetch and return the enriched cart item
	return getCartItemDetail(ctx, itemID)
}

// GetCart retrieves the cart with all enriched item details
func GetCart(ctx context.Context, sessionID string) (*models.CartResponse, error) {
	// Get cart
	var cart models.Cart
	err := database.DB.QueryRowContext(ctx,
		`SELECT id, user_id, session_id, created_at, updated_at, expires_at
		 FROM carts
		 WHERE session_id = $1`,
		sessionID).Scan(&cart.ID, &cart.UserID, &cart.SessionID, &cart.CreatedAt, &cart.UpdatedAt, &cart.ExpiresAt)

	if err == sql.ErrNoRows {
		// Return empty cart
		return &models.CartResponse{
			SessionID:  sessionID,
			Items:      []models.CartItemDetail{},
			TotalItems: 0,
			TotalPrice: 0,
			ExpiresAt:  time.Now().Add(CartExpirationHours * time.Hour),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to query cart: %w", err)
	}

	// Get cart items with enriched details
	rows, err := database.DB.QueryContext(ctx,
		`SELECT
			ci.id, ci.cart_id, ci.event_id, ci.ticket_type_id, ci.quantity,
			ci.seat_ids, ci.created_at, ci.updated_at,
			e.title, e.event_date, e.venue_name,
			tt.name, tt.price
		 FROM cart_items ci
		 JOIN events e ON ci.event_id = e.id
		 JOIN ticket_types tt ON ci.ticket_type_id = tt.id
		 WHERE ci.cart_id = $1
		 ORDER BY ci.created_at`,
		cart.ID)

	if err != nil {
		return nil, fmt.Errorf("failed to query cart items: %w", err)
	}
	defer rows.Close()

	items := []models.CartItemDetail{}
	totalPrice := 0.0
	totalItems := 0

	for rows.Next() {
		var item models.CartItemDetail
		var seatIDs pq.Int64Array

		err := rows.Scan(
			&item.ID, &item.CartID, &item.EventID, &item.TicketTypeID, &item.Quantity,
			&seatIDs, &item.CreatedAt, &item.UpdatedAt,
			&item.EventTitle, &item.EventDate, &item.VenueName,
			&item.TicketTypeName, &item.Price,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan cart item: %w", err)
		}

		// Convert seat IDs
		item.SeatIDs = make([]int, len(seatIDs))
		for i, sid := range seatIDs {
			item.SeatIDs[i] = int(sid)
		}

		// Fetch seat details if seats are assigned
		if len(item.SeatIDs) > 0 {
			item.SeatDetails, err = getSeatDetails(ctx, item.SeatIDs)
			if err != nil {
				return nil, fmt.Errorf("failed to fetch seat details: %w", err)
			}
		}

		item.Subtotal = item.Price * float64(item.Quantity)
		totalPrice += item.Subtotal
		totalItems += item.Quantity

		items = append(items, item)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating cart items: %w", err)
	}

	return &models.CartResponse{
		ID:         cart.ID,
		SessionID:  cart.SessionID,
		Items:      items,
		TotalItems: totalItems,
		TotalPrice: totalPrice,
		ExpiresAt:  cart.ExpiresAt,
		CreatedAt:  cart.CreatedAt,
		UpdatedAt:  cart.UpdatedAt,
	}, nil
}

// UpdateCartItem updates the quantity of a cart item
func UpdateCartItem(ctx context.Context, sessionID string, itemID int, quantity int) error {
	if quantity < 1 {
		return errors.New("quantity must be at least 1")
	}

	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Verify the item belongs to this session's cart
	var cartID int
	var ticketTypeID int
	var currentQuantity int
	var seatIDs pq.Int64Array
	err = tx.QueryRowContext(ctx,
		`SELECT ci.cart_id, ci.ticket_type_id, ci.quantity, ci.seat_ids
		 FROM cart_items ci
		 JOIN carts c ON ci.cart_id = c.id
		 WHERE ci.id = $1 AND c.session_id = $2`,
		itemID, sessionID).Scan(&cartID, &ticketTypeID, &currentQuantity, &seatIDs)

	if err == sql.ErrNoRows {
		return errors.New("cart item not found")
	} else if err != nil {
		return fmt.Errorf("failed to query cart item: %w", err)
	}

	// For assigned seating, quantity cannot be changed
	if len(seatIDs) > 0 && quantity != currentQuantity {
		return errors.New("cannot change quantity for items with assigned seats; remove and re-add instead")
	}

	// Check availability for the new quantity
	var quantityAvailable, quantitySold int
	err = tx.QueryRowContext(ctx,
		`SELECT quantity_available, quantity_sold
		 FROM ticket_types
		 WHERE id = $1`,
		ticketTypeID).Scan(&quantityAvailable, &quantitySold)

	if err != nil {
		return fmt.Errorf("failed to fetch ticket type: %w", err)
	}

	if quantitySold+quantity > quantityAvailable {
		return errors.New("insufficient tickets available for requested quantity")
	}

	// Update the item
	_, err = tx.ExecContext(ctx,
		`UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2`,
		quantity, itemID)
	if err != nil {
		return fmt.Errorf("failed to update cart item: %w", err)
	}

	// Update cart expiration
	_, err = tx.ExecContext(ctx,
		`UPDATE carts SET expires_at = $1, updated_at = NOW() WHERE id = $2`,
		time.Now().Add(CartExpirationHours*time.Hour), cartID)
	if err != nil {
		return fmt.Errorf("failed to update cart expiration: %w", err)
	}

	return tx.Commit()
}

// RemoveCartItem removes an item from the cart and releases seat locks
func RemoveCartItem(ctx context.Context, sessionID string, itemID int) error {
	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get seat IDs before deleting
	var seatIDs pq.Int64Array
	err = tx.QueryRowContext(ctx,
		`SELECT ci.seat_ids
		 FROM cart_items ci
		 JOIN carts c ON ci.cart_id = c.id
		 WHERE ci.id = $1 AND c.session_id = $2`,
		itemID, sessionID).Scan(&seatIDs)

	if err == sql.ErrNoRows {
		return errors.New("cart item not found")
	} else if err != nil {
		return fmt.Errorf("failed to query cart item: %w", err)
	}

	// Release seat locks
	if len(seatIDs) > 0 {
		_, err = tx.ExecContext(ctx,
			`DELETE FROM seat_locks WHERE seat_id = ANY($1) AND session_id = $2`,
			pq.Array(seatIDs), sessionID)
		if err != nil {
			return fmt.Errorf("failed to release seat locks: %w", err)
		}
	}

	// Delete the item
	_, err = tx.ExecContext(ctx,
		`DELETE FROM cart_items WHERE id = $1`,
		itemID)
	if err != nil {
		return fmt.Errorf("failed to delete cart item: %w", err)
	}

	return tx.Commit()
}

// ClearCart removes all items from a cart
func ClearCart(ctx context.Context, sessionID string) error {
	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Release all seat locks for this session
	_, err = tx.ExecContext(ctx,
		`DELETE FROM seat_locks WHERE session_id = $1`,
		sessionID)
	if err != nil {
		return fmt.Errorf("failed to release seat locks: %w", err)
	}

	// Delete cart items
	_, err = tx.ExecContext(ctx,
		`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE session_id = $1)`,
		sessionID)
	if err != nil {
		return fmt.Errorf("failed to clear cart items: %w", err)
	}

	return tx.Commit()
}

// MergeGuestCart migrates a guest cart to an authenticated user's cart
func MergeGuestCart(ctx context.Context, guestSessionID string, userID uuid.UUID, userSessionID string) error {
	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get guest cart
	var guestCartID int
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM carts WHERE session_id = $1`,
		guestSessionID).Scan(&guestCartID)

	if err == sql.ErrNoRows {
		// No guest cart to merge
		return nil
	} else if err != nil {
		return fmt.Errorf("failed to query guest cart: %w", err)
	}

	// Get or create user cart
	userCart, err := GetOrCreateCart(ctx, &userID, userSessionID)
	if err != nil {
		return fmt.Errorf("failed to get user cart: %w", err)
	}

	// Move items from guest cart to user cart
	_, err = tx.ExecContext(ctx,
		`UPDATE cart_items SET cart_id = $1 WHERE cart_id = $2`,
		userCart.ID, guestCartID)
	if err != nil {
		return fmt.Errorf("failed to move cart items: %w", err)
	}

	// Update seat locks to new session ID
	_, err = tx.ExecContext(ctx,
		`UPDATE seat_locks SET session_id = $1 WHERE session_id = $2`,
		userSessionID, guestSessionID)
	if err != nil {
		return fmt.Errorf("failed to update seat locks: %w", err)
	}

	// Delete the guest cart
	_, err = tx.ExecContext(ctx,
		`DELETE FROM carts WHERE id = $1`,
		guestCartID)
	if err != nil {
		return fmt.Errorf("failed to delete guest cart: %w", err)
	}

	return tx.Commit()
}

// CleanupExpiredCarts removes expired carts and their items
func CleanupExpiredCarts(ctx context.Context) (int, error) {
	result, err := database.DB.ExecContext(ctx,
		`DELETE FROM carts WHERE expires_at < NOW()`)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup expired carts: %w", err)
	}

	affected, _ := result.RowsAffected()
	return int(affected), nil
}

// StartCartCleanupJob starts a background job to cleanup expired carts
func StartCartCleanupJob(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for {
			select {
			case <-ticker.C:
				count, err := CleanupExpiredCarts(ctx)
				if err != nil {
					log.Printf("Error cleaning up expired carts: %v", err)
				} else if count > 0 {
					log.Printf("Cleaned up %d expired carts", count)
				}
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}

// Helper function to get cart item details
func getCartItemDetail(ctx context.Context, itemID int) (*models.CartItemDetail, error) {
	var item models.CartItemDetail
	var seatIDs pq.Int64Array

	err := database.DB.QueryRowContext(ctx,
		`SELECT
			ci.id, ci.cart_id, ci.event_id, ci.ticket_type_id, ci.quantity,
			ci.seat_ids, ci.created_at, ci.updated_at,
			e.title, e.event_date, e.venue_name,
			tt.name, tt.price
		 FROM cart_items ci
		 JOIN events e ON ci.event_id = e.id
		 JOIN ticket_types tt ON ci.ticket_type_id = tt.id
		 WHERE ci.id = $1`,
		itemID).Scan(
		&item.ID, &item.CartID, &item.EventID, &item.TicketTypeID, &item.Quantity,
		&seatIDs, &item.CreatedAt, &item.UpdatedAt,
		&item.EventTitle, &item.EventDate, &item.VenueName,
		&item.TicketTypeName, &item.Price,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to fetch cart item detail: %w", err)
	}

	// Convert seat IDs
	item.SeatIDs = make([]int, len(seatIDs))
	for i, sid := range seatIDs {
		item.SeatIDs[i] = int(sid)
	}

	// Fetch seat details if seats are assigned
	if len(item.SeatIDs) > 0 {
		item.SeatDetails, err = getSeatDetails(ctx, item.SeatIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch seat details: %w", err)
		}
	}

	item.Subtotal = item.Price * float64(item.Quantity)

	return &item, nil
}

// Helper function to get seat details
func getSeatDetails(ctx context.Context, seatIDs []int) ([]models.SeatDetail, error) {
	if len(seatIDs) == 0 {
		return []models.SeatDetail{}, nil
	}

	rows, err := database.DB.QueryContext(ctx,
		`SELECT id, section, row_label, seat_number
		 FROM seats
		 WHERE id = ANY($1)
		 ORDER BY section, row_label, seat_number`,
		pq.Array(seatIDs))

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	details := []models.SeatDetail{}
	for rows.Next() {
		var detail models.SeatDetail
		err := rows.Scan(&detail.SeatID, &detail.Section, &detail.RowLabel, &detail.SeatNumber)
		if err != nil {
			return nil, err
		}
		details = append(details, detail)
	}

	return details, rows.Err()
}
