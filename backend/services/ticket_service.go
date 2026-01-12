package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/frallan97/ticket-system/backend/database"
	"github.com/frallan97/ticket-system/backend/models"
	qrcode "github.com/skip2/go-qrcode"
)

const (
	// QRCodeSize is the size of generated QR codes in pixels
	QRCodeSize = 256
	// HMACSecret should be loaded from environment in production
	HMACSecret = "your-secret-key-change-in-production"
)

// QRCodeData represents the data encoded in a ticket QR code
type QRCodeData struct {
	TicketCode    string `json:"ticket_code"`
	EventID       int    `json:"event_id"`
	BookingID     int    `json:"booking_id"`
	TicketTypeID  int    `json:"ticket_type_id"`
	Timestamp     int64  `json:"timestamp"`
	Signature     string `json:"signature"`
}

// GenerateHMAC creates an HMAC signature for ticket validation
func GenerateHMAC(data string) string {
	h := hmac.New(sha256.New, []byte(HMACSecret))
	h.Write([]byte(data))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

// GenerateQRCodeData creates the JSON data for a QR code with signature
func GenerateQRCodeData(ticket *models.Ticket) (string, error) {
	// Create base data
	dataToSign := fmt.Sprintf("%s:%d:%d", ticket.TicketCode, ticket.EventID, ticket.BookingID)
	signature := GenerateHMAC(dataToSign)

	qrData := QRCodeData{
		TicketCode:   ticket.TicketCode,
		EventID:      ticket.EventID,
		BookingID:    ticket.BookingID,
		TicketTypeID: ticket.TicketTypeID,
		Timestamp:    ticket.CreatedAt.Unix(),
		Signature:    signature,
	}

	jsonData, err := json.Marshal(qrData)
	if err != nil {
		return "", fmt.Errorf("failed to marshal QR data: %w", err)
	}

	return string(jsonData), nil
}

// GenerateQRCodeImage generates a QR code image as PNG bytes
func GenerateQRCodeImage(ticketCode string) ([]byte, error) {
	// Get ticket from database
	ticket, err := GetTicketByCode(context.Background(), ticketCode)
	if err != nil {
		return nil, fmt.Errorf("failed to get ticket: %w", err)
	}

	// Generate QR code PNG
	png, err := qrcode.Encode(ticket.QRCodeData, qrcode.Medium, QRCodeSize)
	if err != nil {
		return nil, fmt.Errorf("failed to encode QR code: %w", err)
	}

	return png, nil
}

// GetTicketByCode retrieves a ticket by its code
func GetTicketByCode(ctx context.Context, ticketCode string) (*models.Ticket, error) {
	query := `
		SELECT id, booking_id, event_id, ticket_type_id, seat_id, ticket_code,
			   qr_code_data, price_paid, attendee_name, attendee_email,
			   is_checked_in, checked_in_at, checked_in_by, created_at, updated_at
		FROM tickets
		WHERE ticket_code = $1
	`

	var ticket models.Ticket
	err := database.DB.QueryRowContext(ctx, query, ticketCode).Scan(
		&ticket.ID, &ticket.BookingID, &ticket.EventID, &ticket.TicketTypeID,
		&ticket.SeatID, &ticket.TicketCode, &ticket.QRCodeData, &ticket.PricePaid,
		&ticket.AttendeeName, &ticket.AttendeeEmail, &ticket.IsCheckedIn,
		&ticket.CheckedInAt, &ticket.CheckedInBy, &ticket.CreatedAt, &ticket.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	return &ticket, nil
}

// ValidateTicketCode validates a ticket QR code signature
func ValidateTicketCode(ctx context.Context, ticketCode string) (*models.TicketDetailResponse, error) {
	// Get ticket
	ticket, err := GetTicketByCode(ctx, ticketCode)
	if err != nil {
		return nil, errors.New("ticket not found")
	}

	// Parse QR data
	var qrData QRCodeData
	if err := json.Unmarshal([]byte(ticket.QRCodeData), &qrData); err != nil {
		return nil, errors.New("invalid QR data format")
	}

	// Verify signature
	dataToVerify := fmt.Sprintf("%s:%d:%d", qrData.TicketCode, qrData.EventID, qrData.BookingID)
	expectedSignature := GenerateHMAC(dataToVerify)

	if qrData.Signature != expectedSignature {
		return nil, errors.New("invalid ticket signature - possible forgery")
	}

	// Get event details
	var eventTitle, venueName string
	var eventDate interface{}
	err = database.DB.QueryRowContext(ctx,
		`SELECT title, venue_name, event_date FROM events WHERE id = $1`,
		ticket.EventID).Scan(&eventTitle, &venueName, &eventDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get event details: %w", err)
	}

	// Get ticket type name
	var ticketTypeName string
	err = database.DB.QueryRowContext(ctx,
		`SELECT name FROM ticket_types WHERE id = $1`,
		ticket.TicketTypeID).Scan(&ticketTypeName)
	if err != nil {
		ticketTypeName = "Unknown"
	}

	// Get seat info if applicable
	var seatInfo *string
	if ticket.SeatID != nil {
		var section, rowLabel, seatNumber string
		err = database.DB.QueryRowContext(ctx,
			`SELECT section, row_label, seat_number FROM seats WHERE id = $1`,
			*ticket.SeatID).Scan(&section, &rowLabel, &seatNumber)
		if err == nil {
			info := fmt.Sprintf("Section %s, Row %s, Seat %s", section, rowLabel, seatNumber)
			seatInfo = &info
		}
	}

	response := &models.TicketDetailResponse{
		Ticket:         *ticket,
		EventTitle:     eventTitle,
		VenueName:      venueName,
		TicketTypeName: ticketTypeName,
		SeatInfo:       seatInfo,
	}

	return response, nil
}

// CheckInTicket marks a ticket as checked in
func CheckInTicket(ctx context.Context, ticketCode string, staffUserID interface{}) error {
	// First validate the ticket
	_, err := ValidateTicketCode(ctx, ticketCode)
	if err != nil {
		return err
	}

	// Check if already checked in
	var isCheckedIn bool
	err = database.DB.QueryRowContext(ctx,
		`SELECT is_checked_in FROM tickets WHERE ticket_code = $1`,
		ticketCode).Scan(&isCheckedIn)
	if err != nil {
		return fmt.Errorf("failed to check ticket status: %w", err)
	}

	if isCheckedIn {
		return errors.New("ticket already checked in")
	}

	// Mark as checked in
	_, err = database.DB.ExecContext(ctx,
		`UPDATE tickets
		 SET is_checked_in = TRUE, checked_in_at = NOW(), checked_in_by = $1
		 WHERE ticket_code = $2`,
		staffUserID, ticketCode)

	if err != nil {
		return fmt.Errorf("failed to check in ticket: %w", err)
	}

	return nil
}

// GetCheckinStats returns check-in statistics for an event
func GetCheckinStats(ctx context.Context, eventID int) (map[string]interface{}, error) {
	var totalTickets, checkedInCount int

	err := database.DB.QueryRowContext(ctx,
		`SELECT COUNT(*), COUNT(*) FILTER (WHERE is_checked_in = TRUE)
		 FROM tickets
		 WHERE event_id = $1`,
		eventID).Scan(&totalTickets, &checkedInCount)

	if err != nil {
		return nil, fmt.Errorf("failed to get check-in stats: %w", err)
	}

	stats := map[string]interface{}{
		"total_tickets":    totalTickets,
		"checked_in":       checkedInCount,
		"pending_checkin":  totalTickets - checkedInCount,
		"checkin_rate":     0.0,
	}

	if totalTickets > 0 {
		stats["checkin_rate"] = float64(checkedInCount) / float64(totalTickets) * 100
	}

	return stats, nil
}
