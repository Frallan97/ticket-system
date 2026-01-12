package services

import (
	"context"
	"fmt"

	"github.com/frallan97/ticket-system/backend/database"
	"github.com/frallan97/ticket-system/backend/models"
)

// GetEventAnalytics returns comprehensive analytics for an event
func GetEventAnalytics(ctx context.Context, eventID int) (*models.EventAnalytics, error) {
	analytics := &models.EventAnalytics{
		EventID: eventID,
	}

	// Get total bookings count
	err := database.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM bookings WHERE event_id = $1`,
		eventID,
	).Scan(&analytics.TotalBookings)
	if err != nil {
		return nil, fmt.Errorf("failed to get total bookings: %w", err)
	}

	// Get total tickets sold and revenue
	err = database.DB.QueryRowContext(ctx,
		`SELECT
			COALESCE(COUNT(*), 0) as total_tickets,
			COALESCE(SUM(price_paid), 0) as total_revenue
		FROM tickets
		WHERE event_id = $1`,
		eventID,
	).Scan(&analytics.TotalTicketsSold, &analytics.TotalRevenue)
	if err != nil {
		return nil, fmt.Errorf("failed to get tickets and revenue: %w", err)
	}

	// Get checked-in count
	err = database.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM tickets
		WHERE event_id = $1 AND is_checked_in = TRUE`,
		eventID,
	).Scan(&analytics.CheckedInCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get checked-in count: %w", err)
	}

	// Get ticket type breakdown
	rows, err := database.DB.QueryContext(ctx,
		`SELECT
			tt.name,
			COUNT(t.id) as sold,
			COALESCE(SUM(t.price_paid), 0) as revenue
		FROM ticket_types tt
		LEFT JOIN tickets t ON t.ticket_type_id = tt.id
		WHERE tt.event_id = $1
		GROUP BY tt.id, tt.name
		ORDER BY tt.name`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get ticket type breakdown: %w", err)
	}
	defer rows.Close()

	analytics.TicketTypeBreakdown = []models.TicketTypeAnalytics{}
	for rows.Next() {
		var breakdown models.TicketTypeAnalytics
		if err := rows.Scan(&breakdown.TypeName, &breakdown.Sold, &breakdown.Revenue); err != nil {
			continue
		}
		analytics.TicketTypeBreakdown = append(analytics.TicketTypeBreakdown, breakdown)
	}

	// Get sales over time (last 30 days grouped by day)
	rows, err = database.DB.QueryContext(ctx,
		`SELECT
			DATE(b.booking_date) as date,
			COUNT(DISTINCT b.id) as bookings,
			COUNT(t.id) as tickets,
			COALESCE(SUM(t.price_paid), 0) as revenue
		FROM bookings b
		LEFT JOIN tickets t ON t.booking_id = b.id
		WHERE b.event_id = $1
		AND b.booking_date >= NOW() - INTERVAL '30 days'
		GROUP BY DATE(b.booking_date)
		ORDER BY date DESC`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get sales over time: %w", err)
	}
	defer rows.Close()

	analytics.SalesOverTime = []models.SalesAnalytics{}
	for rows.Next() {
		var sales models.SalesAnalytics
		if err := rows.Scan(&sales.Date, &sales.Bookings, &sales.Tickets, &sales.Revenue); err != nil {
			continue
		}
		analytics.SalesOverTime = append(analytics.SalesOverTime, sales)
	}

	// Calculate check-in rate
	if analytics.TotalTicketsSold > 0 {
		analytics.CheckInRate = float64(analytics.CheckedInCount) / float64(analytics.TotalTicketsSold) * 100
	}

	return analytics, nil
}

// GetCheckinStatus returns check-in statistics for an event
func GetCheckinStatus(ctx context.Context, eventID int) (*models.CheckinStatusResponse, error) {
	status := &models.CheckinStatusResponse{
		EventID: eventID,
	}

	// Get total tickets and checked-in count
	err := database.DB.QueryRowContext(ctx,
		`SELECT
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN is_checked_in THEN 1 ELSE 0 END), 0) as checked_in
		FROM tickets
		WHERE event_id = $1`,
		eventID,
	).Scan(&status.TotalTickets, &status.CheckedInCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get check-in status: %w", err)
	}

	status.PendingCount = status.TotalTickets - status.CheckedInCount

	// Calculate check-in rate
	if status.TotalTickets > 0 {
		status.CheckInRate = float64(status.CheckedInCount) / float64(status.TotalTickets) * 100
	}

	// Get recent check-ins (last 10)
	rows, err := database.DB.QueryContext(ctx,
		`SELECT
			t.ticket_code,
			t.checked_in_at,
			COALESCE(t.attendee_name, b.customer_name) as name
		FROM tickets t
		JOIN bookings b ON b.id = t.booking_id
		WHERE t.event_id = $1 AND t.is_checked_in = TRUE
		ORDER BY t.checked_in_at DESC
		LIMIT 10`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent check-ins: %w", err)
	}
	defer rows.Close()

	status.RecentCheckIns = []models.RecentCheckIn{}
	for rows.Next() {
		var checkIn models.RecentCheckIn
		if err := rows.Scan(&checkIn.TicketCode, &checkIn.CheckedInAt, &checkIn.AttendeeName); err != nil {
			continue
		}
		status.RecentCheckIns = append(status.RecentCheckIns, checkIn)
	}

	return status, nil
}

// GetEventBookings returns all bookings for an event (organizer view)
func GetEventBookings(ctx context.Context, eventID int) ([]models.BookingWithTickets, error) {
	query := `
		SELECT
			b.id, b.customer_id, b.booking_reference, b.total_amount,
			b.status, b.payment_status, b.customer_email, b.customer_name,
			b.customer_phone, b.booking_date, b.created_at,
			COUNT(t.id) as ticket_count
		FROM bookings b
		LEFT JOIN tickets t ON t.booking_id = b.id
		WHERE b.event_id = $1
		GROUP BY b.id
		ORDER BY b.booking_date DESC
	`

	rows, err := database.DB.QueryContext(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch event bookings: %w", err)
	}
	defer rows.Close()

	bookings := []models.BookingWithTickets{}
	for rows.Next() {
		var booking models.BookingWithTickets
		var ticketCount int

		err := rows.Scan(
			&booking.ID, &booking.CustomerID, &booking.BookingReference,
			&booking.TotalAmount, &booking.Status, &booking.PaymentStatus,
			&booking.CustomerEmail, &booking.CustomerName, &booking.CustomerPhone,
			&booking.BookingDate, &booking.CreatedAt, &ticketCount,
		)
		if err != nil {
			continue
		}

		booking.TicketCount = ticketCount
		bookings = append(bookings, booking)
	}

	return bookings, nil
}
