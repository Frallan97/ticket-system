package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/frallan97/ticket-system/backend/database"
	"github.com/frallan97/ticket-system/backend/models"
	"github.com/google/uuid"
)

// GenerateBookingReference generates a unique booking reference
func GenerateBookingReference() (string, error) {
	bytes := make([]byte, 6)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return strings.ToUpper(hex.EncodeToString(bytes)), nil
}

// GenerateTicketCode generates a unique ticket code
func GenerateTicketCode() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return strings.ToUpper(hex.EncodeToString(bytes)), nil
}

// CreateBooking creates a new booking with tickets in a transaction
func CreateBooking(ctx context.Context, customerID uuid.UUID, req models.CreateBookingRequest) (*models.Booking, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("no booking items provided")
	}

	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Verify event exists
	var eventExists bool
	err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM events WHERE id = $1)", req.EventID).Scan(&eventExists)
	if err != nil || !eventExists {
		return nil, errors.New("event not found")
	}

	// Calculate total amount and verify ticket types
	var totalAmount float64
	ticketTypeMap := make(map[int]float64) // ticket_type_id -> price

	for _, item := range req.Items {
		var price float64
		var quantityAvailable, quantitySold int

		err := tx.QueryRowContext(ctx,
			`SELECT price, quantity_available, quantity_sold
			 FROM ticket_types
			 WHERE id = $1 AND event_id = $2 AND is_active = TRUE`,
			item.TicketTypeID, req.EventID).Scan(&price, &quantityAvailable, &quantitySold)

		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("ticket type %d not found", item.TicketTypeID)
		} else if err != nil {
			return nil, fmt.Errorf("failed to fetch ticket type: %w", err)
		}

		// Check availability
		if quantitySold+item.Quantity > quantityAvailable {
			return nil, fmt.Errorf("ticket type %d has insufficient quantity", item.TicketTypeID)
		}

		ticketTypeMap[item.TicketTypeID] = price
		totalAmount += price * float64(item.Quantity)
	}

	// If seats are involved, verify they're locked by this session
	allSeatIDs := []int{}
	for _, item := range req.Items {
		allSeatIDs = append(allSeatIDs, item.SeatIDs...)
	}

	if len(allSeatIDs) > 0 {
		// Verify all seats are locked by this session
		var lockedCount int
		err = tx.QueryRowContext(ctx,
			`SELECT COUNT(*)
			 FROM seat_locks
			 WHERE seat_id = ANY($1)
			 AND session_id = $2
			 AND expires_at > NOW()`,
			allSeatIDs, req.SessionID).Scan(&lockedCount)

		if err != nil {
			return nil, fmt.Errorf("failed to verify seat locks: %w", err)
		}

		if lockedCount != len(allSeatIDs) {
			return nil, errors.New("not all seats are locked by your session")
		}
	}

	// Generate booking reference
	bookingRef, err := GenerateBookingReference()
	if err != nil {
		return nil, fmt.Errorf("failed to generate booking reference: %w", err)
	}

	// Create booking record
	bookingQuery := `
		INSERT INTO bookings (customer_id, event_id, booking_reference, total_amount,
							  status, payment_status, customer_email, customer_name, customer_phone)
		VALUES ($1, $2, $3, $4, 'confirmed', 'completed', $5, $6, $7)
		RETURNING id, booking_date, created_at, updated_at
	`

	var booking models.Booking
	booking.CustomerID = customerID
	booking.EventID = req.EventID
	booking.BookingReference = bookingRef
	booking.TotalAmount = totalAmount
	booking.Status = "confirmed"
	booking.PaymentStatus = "completed"
	booking.CustomerEmail = req.CustomerEmail
	booking.CustomerName = req.CustomerName
	booking.CustomerPhone = req.CustomerPhone

	err = tx.QueryRowContext(ctx, bookingQuery,
		customerID, req.EventID, bookingRef, totalAmount,
		req.CustomerEmail, req.CustomerName, req.CustomerPhone,
	).Scan(&booking.ID, &booking.BookingDate, &booking.CreatedAt, &booking.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	// Create tickets for each item
	ticketQuery := `
		INSERT INTO tickets (booking_id, event_id, ticket_type_id, seat_id,
							 ticket_code, qr_code_data, price_paid)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	seatIndex := 0
	for _, item := range req.Items {
		price := ticketTypeMap[item.TicketTypeID]

		for i := 0; i < item.Quantity; i++ {
			ticketCode, err := GenerateTicketCode()
			if err != nil {
				return nil, fmt.Errorf("failed to generate ticket code: %w", err)
			}

			// Generate QR code data with HMAC signature
			tempTicket := &models.Ticket{
				TicketCode:   ticketCode,
				EventID:      req.EventID,
				BookingID:    booking.ID,
				TicketTypeID: item.TicketTypeID,
				CreatedAt:    booking.CreatedAt,
			}
			qrData, err := GenerateQRCodeData(tempTicket)
			if err != nil {
				return nil, fmt.Errorf("failed to generate QR data: %w", err)
			}

			var seatID *int
			if seatIndex < len(item.SeatIDs) {
				seatID = &item.SeatIDs[seatIndex]
				seatIndex++
			}

			_, err = tx.ExecContext(ctx, ticketQuery,
				booking.ID, req.EventID, item.TicketTypeID, seatID,
				ticketCode, qrData, price,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to create ticket: %w", err)
			}
		}

		// Update ticket_types quantity_sold
		_, err = tx.ExecContext(ctx,
			`UPDATE ticket_types SET quantity_sold = quantity_sold + $1 WHERE id = $2`,
			item.Quantity, item.TicketTypeID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to update ticket type quantity: %w", err)
		}
	}

	// Mark seats as unavailable and delete locks
	if len(allSeatIDs) > 0 {
		_, err = tx.ExecContext(ctx,
			`UPDATE seats SET is_available = FALSE WHERE id = ANY($1)`,
			allSeatIDs,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to mark seats as unavailable: %w", err)
		}

		_, err = tx.ExecContext(ctx,
			`DELETE FROM seat_locks WHERE session_id = $1`,
			req.SessionID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to delete seat locks: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Send confirmation email asynchronously (don't fail if email fails)
	go func() {
		emailService := NewEmailService()
		if err := sendBookingConfirmationEmail(ctx, emailService, &booking, req.EventID); err != nil {
			// Log error but don't fail the booking
			fmt.Printf("Failed to send confirmation email: %v\n", err)
		}
	}()

	return &booking, nil
}

// sendBookingConfirmationEmail sends a confirmation email for a booking
func sendBookingConfirmationEmail(ctx context.Context, emailService *EmailService, booking *models.Booking, eventID int) error {
	// Fetch event details
	var eventTitle, venueName string
	var venueAddress *string
	var eventDate string

	err := database.DB.QueryRowContext(ctx,
		`SELECT title, venue_name, venue_address, event_date FROM events WHERE id = $1`,
		eventID).Scan(&eventTitle, &venueName, &venueAddress, &eventDate)
	if err != nil {
		return fmt.Errorf("failed to fetch event details: %w", err)
	}

	// Fetch tickets for this booking
	rows, err := database.DB.QueryContext(ctx,
		`SELECT t.ticket_code, tt.name, s.section, s.row_label, s.seat_number
		 FROM tickets t
		 JOIN ticket_types tt ON t.ticket_type_id = tt.id
		 LEFT JOIN seats s ON t.seat_id = s.id
		 WHERE t.booking_id = $1`,
		booking.ID)
	if err != nil {
		return fmt.Errorf("failed to fetch tickets: %w", err)
	}
	defer rows.Close()

	var tickets []TicketInfo
	for rows.Next() {
		var ticket TicketInfo
		var section, rowLabel, seatNumber *string

		if err := rows.Scan(&ticket.TicketCode, &ticket.TicketType, &section, &rowLabel, &seatNumber); err != nil {
			continue
		}

		if section != nil && rowLabel != nil && seatNumber != nil {
			ticket.SeatInfo = fmt.Sprintf("%s - Row %s, Seat %s", *section, *rowLabel, *seatNumber)
		}

		tickets = append(tickets, ticket)
	}

	// Prepare email data
	emailData := TicketConfirmationData{
		CustomerName:     booking.CustomerName,
		EventTitle:       eventTitle,
		EventDate:        eventDate[:10], // Just the date part
		EventTime:        eventDate[11:16], // Just the time part
		VenueName:        venueName,
		VenueAddress:     "",
		BookingReference: booking.BookingReference,
		TicketCount:      len(tickets),
		TotalAmount:      fmt.Sprintf("$%.2f", booking.TotalAmount),
		Tickets:          tickets,
	}

	if venueAddress != nil {
		emailData.VenueAddress = *venueAddress
	}

	// Send email
	return emailService.SendTicketConfirmation(booking.CustomerEmail, emailData)
}

// GetBookingByID retrieves a booking by ID
func GetBookingByID(ctx context.Context, bookingID int, customerID uuid.UUID) (*models.BookingDetailResponse, error) {
	query := `
		SELECT id, customer_id, event_id, booking_reference, total_amount, status,
			   payment_status, customer_email, customer_name, customer_phone,
			   booking_date, created_at, updated_at
		FROM bookings
		WHERE id = $1 AND customer_id = $2
	`

	var booking models.Booking
	err := database.DB.QueryRowContext(ctx, query, bookingID, customerID).Scan(
		&booking.ID, &booking.CustomerID, &booking.EventID, &booking.BookingReference,
		&booking.TotalAmount, &booking.Status, &booking.PaymentStatus,
		&booking.CustomerEmail, &booking.CustomerName, &booking.CustomerPhone,
		&booking.BookingDate, &booking.CreatedAt, &booking.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("booking not found")
	} else if err != nil {
		return nil, fmt.Errorf("failed to fetch booking: %w", err)
	}

	// Get tickets for this booking
	ticketsQuery := `
		SELECT id, booking_id, event_id, ticket_type_id, seat_id, ticket_code,
			   qr_code_data, price_paid, attendee_name, attendee_email,
			   is_checked_in, checked_in_at, checked_in_by, created_at, updated_at
		FROM tickets
		WHERE booking_id = $1
		ORDER BY id
	`

	rows, err := database.DB.QueryContext(ctx, ticketsQuery, bookingID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tickets: %w", err)
	}
	defer rows.Close()

	tickets := []models.Ticket{}
	for rows.Next() {
		var ticket models.Ticket
		err := rows.Scan(
			&ticket.ID, &ticket.BookingID, &ticket.EventID, &ticket.TicketTypeID,
			&ticket.SeatID, &ticket.TicketCode, &ticket.QRCodeData, &ticket.PricePaid,
			&ticket.AttendeeName, &ticket.AttendeeEmail, &ticket.IsCheckedIn,
			&ticket.CheckedInAt, &ticket.CheckedInBy, &ticket.CreatedAt, &ticket.UpdatedAt,
		)
		if err != nil {
			continue
		}
		tickets = append(tickets, ticket)
	}

	return &models.BookingDetailResponse{
		Booking: booking,
		Tickets: tickets,
	}, nil
}

// GetCustomerBookings retrieves all bookings for a customer
func GetCustomerBookings(ctx context.Context, customerID uuid.UUID) ([]models.Booking, error) {
	query := `
		SELECT id, customer_id, event_id, booking_reference, total_amount, status,
			   payment_status, customer_email, customer_name, customer_phone,
			   booking_date, created_at, updated_at
		FROM bookings
		WHERE customer_id = $1
		ORDER BY created_at DESC
	`

	rows, err := database.DB.QueryContext(ctx, query, customerID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch bookings: %w", err)
	}
	defer rows.Close()

	bookings := []models.Booking{}
	for rows.Next() {
		var booking models.Booking
		err := rows.Scan(
			&booking.ID, &booking.CustomerID, &booking.EventID, &booking.BookingReference,
			&booking.TotalAmount, &booking.Status, &booking.PaymentStatus,
			&booking.CustomerEmail, &booking.CustomerName, &booking.CustomerPhone,
			&booking.BookingDate, &booking.CreatedAt, &booking.UpdatedAt,
		)
		if err != nil {
			continue
		}
		bookings = append(bookings, booking)
	}

	return bookings, nil
}
