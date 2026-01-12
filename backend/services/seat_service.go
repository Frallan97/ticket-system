package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/frallan97/ticket-system/backend/database"
	"github.com/frallan97/ticket-system/backend/models"
)

const (
	// SeatLockDuration is how long seats are locked during checkout
	SeatLockDuration = 5 * time.Minute
)

// LockSeats locks the specified seats for the given session
// Returns an error if any seat is already locked or unavailable
func LockSeats(ctx context.Context, seatIDs []int, sessionID string) (*models.LockSeatsResponse, error) {
	if len(seatIDs) == 0 {
		return nil, errors.New("no seats provided")
	}

	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	expiresAt := time.Now().Add(SeatLockDuration)

	// Check if any seats are already locked or unavailable
	query := `
		SELECT s.id, s.is_available,
			   EXISTS(SELECT 1 FROM seat_locks sl WHERE sl.seat_id = s.id AND sl.expires_at > NOW()) as is_locked
		FROM seats s
		WHERE s.id = ANY($1)
		FOR UPDATE
	`

	rows, err := tx.QueryContext(ctx, query, seatIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to check seat availability: %w", err)
	}
	defer rows.Close()

	unavailableSeats := []int{}
	lockedSeats := []int{}

	for rows.Next() {
		var seatID int
		var isAvailable bool
		var isLocked bool

		if err := rows.Scan(&seatID, &isAvailable, &isLocked); err != nil {
			return nil, fmt.Errorf("failed to scan seat: %w", err)
		}

		if !isAvailable {
			unavailableSeats = append(unavailableSeats, seatID)
		}
		if isLocked {
			lockedSeats = append(lockedSeats, seatID)
		}
	}

	if len(unavailableSeats) > 0 {
		return nil, fmt.Errorf("seats unavailable: %v", unavailableSeats)
	}

	if len(lockedSeats) > 0 {
		return nil, fmt.Errorf("seats already locked: %v", lockedSeats)
	}

	// Lock all seats
	lockQuery := `
		INSERT INTO seat_locks (seat_id, session_id, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (seat_id) DO UPDATE
		SET session_id = EXCLUDED.session_id,
			expires_at = EXCLUDED.expires_at,
			locked_at = NOW()
		WHERE seat_locks.expires_at < NOW() OR seat_locks.session_id = EXCLUDED.session_id
	`

	lockedCount := 0
	for _, seatID := range seatIDs {
		result, err := tx.ExecContext(ctx, lockQuery, seatID, sessionID, expiresAt)
		if err != nil {
			return nil, fmt.Errorf("failed to lock seat %d: %w", seatID, err)
		}

		affected, _ := result.RowsAffected()
		if affected > 0 {
			lockedCount++
		}
	}

	if lockedCount != len(seatIDs) {
		return nil, errors.New("failed to lock all seats, some may be locked by another session")
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &models.LockSeatsResponse{
		SessionID:   sessionID,
		ExpiresAt:   expiresAt,
		LockedCount: lockedCount,
	}, nil
}

// UnlockSeats removes locks for the given session
func UnlockSeats(ctx context.Context, sessionID string) error {
	query := `DELETE FROM seat_locks WHERE session_id = $1`
	_, err := database.DB.ExecContext(ctx, query, sessionID)
	if err != nil {
		return fmt.Errorf("failed to unlock seats: %w", err)
	}
	return nil
}

// CleanupExpiredLocks removes all expired seat locks
// This should be called periodically in a background job
func CleanupExpiredLocks(ctx context.Context) (int, error) {
	query := `DELETE FROM seat_locks WHERE expires_at < NOW()`
	result, err := database.DB.ExecContext(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup expired locks: %w", err)
	}

	affected, _ := result.RowsAffected()
	return int(affected), nil
}

// StartLockCleanupJob starts a background job to cleanup expired seat locks
func StartLockCleanupJob(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		for {
			select {
			case <-ticker.C:
				count, err := CleanupExpiredLocks(ctx)
				if err != nil {
					log.Printf("Error cleaning up expired locks: %v", err)
				} else if count > 0 {
					log.Printf("Cleaned up %d expired seat locks", count)
				}
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}

// CheckSeatAvailability checks if seats are available and not locked
func CheckSeatAvailability(ctx context.Context, eventID int, seatIDs []int) (map[int]bool, error) {
	if len(seatIDs) == 0 {
		return map[int]bool{}, nil
	}

	query := `
		SELECT s.id,
			   s.is_available AND NOT EXISTS(
				   SELECT 1 FROM seat_locks sl
				   WHERE sl.seat_id = s.id AND sl.expires_at > NOW()
			   ) as available
		FROM seats s
		WHERE s.event_id = $1 AND s.id = ANY($2)
	`

	rows, err := database.DB.QueryContext(ctx, query, eventID, seatIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to check seat availability: %w", err)
	}
	defer rows.Close()

	availability := make(map[int]bool)
	for rows.Next() {
		var seatID int
		var available bool
		if err := rows.Scan(&seatID, &available); err != nil {
			return nil, fmt.Errorf("failed to scan availability: %w", err)
		}
		availability[seatID] = available
	}

	return availability, nil
}

// GetSeatsWithLockStatus returns seats with their lock status
func GetSeatsWithLockStatus(ctx context.Context, eventID int) ([]models.Seat, error) {
	query := `
		SELECT s.id, s.event_id, s.section, s.row_label, s.seat_number,
			   s.ticket_type_id, s.is_available,
			   EXISTS(SELECT 1 FROM seat_locks sl WHERE sl.seat_id = s.id AND sl.expires_at > NOW()) as is_locked,
			   s.created_at
		FROM seats s
		WHERE s.event_id = $1
		ORDER BY s.section, s.row_label, s.seat_number
	`

	rows, err := database.DB.QueryContext(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch seats: %w", err)
	}
	defer rows.Close()

	seats := []models.Seat{}
	for rows.Next() {
		var seat models.Seat
		err := rows.Scan(
			&seat.ID, &seat.EventID, &seat.Section, &seat.RowLabel, &seat.SeatNumber,
			&seat.TicketTypeID, &seat.IsAvailable, &seat.IsLocked, &seat.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan seat: %w", err)
		}
		seats = append(seats, seat)
	}

	return seats, nil
}
