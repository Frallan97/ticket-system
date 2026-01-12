package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"os"
)

// EmailConfig holds SMTP configuration
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

// LoadEmailConfig loads email configuration from environment
func LoadEmailConfig() *EmailConfig {
	return &EmailConfig{
		SMTPHost:     getEnvOrDefault("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnvOrDefault("SMTP_PORT", "587"),
		SMTPUser:     getEnvOrDefault("SMTP_USER", ""),
		SMTPPassword: getEnvOrDefault("SMTP_PASSWORD", ""),
		FromEmail:    getEnvOrDefault("FROM_EMAIL", "noreply@example.com"),
		FromName:     getEnvOrDefault("FROM_NAME", "Ticket System"),
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// EmailService handles sending emails
type EmailService struct {
	config *EmailConfig
}

// NewEmailService creates a new email service
func NewEmailService() *EmailService {
	config := LoadEmailConfig()
	return &EmailService{
		config: config,
	}
}

// IsConfigured checks if email service is properly configured
func (s *EmailService) IsConfigured() bool {
	return s.config.SMTPUser != "" && s.config.SMTPPassword != ""
}

// SendEmail sends an email using SMTP
func (s *EmailService) SendEmail(to, subject, htmlBody string) error {
	if !s.IsConfigured() {
		log.Printf("Email service not configured, skipping email to %s", to)
		return nil // Don't fail, just skip
	}

	from := fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail)

	msg := []byte(fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: text/html; charset=UTF-8\r\n"+
		"\r\n"+
		"%s\r\n", from, to, subject, htmlBody))

	auth := smtp.PlainAuth("", s.config.SMTPUser, s.config.SMTPPassword, s.config.SMTPHost)
	addr := fmt.Sprintf("%s:%s", s.config.SMTPHost, s.config.SMTPPort)

	err := smtp.SendMail(addr, auth, s.config.FromEmail, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("Email sent successfully to %s: %s", to, subject)
	return nil
}

// TicketConfirmationData holds data for ticket confirmation email
type TicketConfirmationData struct {
	CustomerName     string
	EventTitle       string
	EventDate        string
	EventTime        string
	VenueName        string
	VenueAddress     string
	BookingReference string
	TicketCount      int
	TotalAmount      string
	Tickets          []TicketInfo
}

type TicketInfo struct {
	TicketCode  string
	TicketType  string
	SeatInfo    string
	QRCodeURL   string
}

// SendTicketConfirmation sends a ticket confirmation email
func (s *EmailService) SendTicketConfirmation(to string, data TicketConfirmationData) error {
	tmpl := template.Must(template.New("confirmation").Parse(ticketConfirmationTemplate))

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	subject := fmt.Sprintf("Your Tickets for %s - Booking %s", data.EventTitle, data.BookingReference)
	return s.SendEmail(to, subject, body.String())
}

// EventReminderData holds data for event reminder email
type EventReminderData struct {
	CustomerName     string
	EventTitle       string
	EventDate        string
	EventTime        string
	VenueName        string
	VenueAddress     string
	DoorsOpen        string
	TicketCount      int
	BookingReference string
}

// SendEventReminder sends an event reminder email
func (s *EmailService) SendEventReminder(to string, data EventReminderData) error {
	tmpl := template.Must(template.New("reminder").Parse(eventReminderTemplate))

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	subject := fmt.Sprintf("Reminder: %s - Tomorrow!", data.EventTitle)
	return s.SendEmail(to, subject, body.String())
}

// Email templates
const ticketConfirmationTemplate = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
		.content { background: #f9f9f9; padding: 20px; }
		.ticket { background: white; border: 2px solid #4F46E5; border-radius: 8px; padding: 15px; margin: 10px 0; }
		.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
		.button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>🎟️ Booking Confirmed!</h1>
		</div>
		<div class="content">
			<h2>Hi {{.CustomerName}},</h2>
			<p>Thank you for your booking! Your tickets for <strong>{{.EventTitle}}</strong> have been confirmed.</p>

			<div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
				<h3 style="margin-top: 0;">Event Details</h3>
				<p><strong>📅 Date:</strong> {{.EventDate}}<br>
				<strong>🕐 Time:</strong> {{.EventTime}}<br>
				<strong>📍 Venue:</strong> {{.VenueName}}<br>
				{{if .VenueAddress}}<strong>Address:</strong> {{.VenueAddress}}<br>{{end}}
				<strong>🎫 Tickets:</strong> {{.TicketCount}}<br>
				<strong>💰 Total:</strong> {{.TotalAmount}}<br>
				<strong>📋 Reference:</strong> {{.BookingReference}}</p>
			</div>

			<h3>Your Tickets</h3>
			{{range .Tickets}}
			<div class="ticket">
				<p><strong>Ticket:</strong> {{.TicketCode}}<br>
				<strong>Type:</strong> {{.TicketType}}
				{{if .SeatInfo}}<br><strong>Seat:</strong> {{.SeatInfo}}{{end}}
				</p>
			</div>
			{{end}}

			<p style="margin-top: 30px;"><strong>Important:</strong> Please bring your tickets (digital or printed) to the event. You can access your tickets anytime from your booking dashboard.</p>
		</div>
		<div class="footer">
			<p>This is an automated message. Please do not reply to this email.</p>
			<p>&copy; 2024 Ticket System. All rights reserved.</p>
		</div>
	</div>
</body>
</html>
`

const eventReminderTemplate = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
		.content { background: #f9f9f9; padding: 20px; }
		.reminder-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
		.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>⏰ Event Reminder</h1>
		</div>
		<div class="content">
			<h2>Hi {{.CustomerName}},</h2>
			<div class="reminder-box">
				<h3 style="margin-top: 0;">Your event is tomorrow!</h3>
				<p><strong>{{.EventTitle}}</strong> is happening soon. We're excited to see you there!</p>
			</div>

			<div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
				<h3 style="margin-top: 0;">Event Details</h3>
				<p><strong>📅 Date:</strong> {{.EventDate}}<br>
				<strong>🕐 Time:</strong> {{.EventTime}}<br>
				{{if .DoorsOpen}}<strong>🚪 Doors Open:</strong> {{.DoorsOpen}}<br>{{end}}
				<strong>📍 Venue:</strong> {{.VenueName}}<br>
				{{if .VenueAddress}}<strong>Address:</strong> {{.VenueAddress}}<br>{{end}}
				<strong>🎫 Your Tickets:</strong> {{.TicketCount}}<br>
				<strong>📋 Booking Reference:</strong> {{.BookingReference}}</p>
			</div>

			<h3>Checklist</h3>
			<ul>
				<li>✓ Have your tickets ready (digital or printed)</li>
				<li>✓ Arrive 30 minutes before the event start time</li>
				<li>✓ Check for any parking or transportation information</li>
				<li>✓ Bring a valid ID if required</li>
			</ul>

			<p style="margin-top: 30px;">Looking forward to seeing you there! Have a great time! 🎉</p>
		</div>
		<div class="footer">
			<p>This is an automated reminder. Please do not reply to this email.</p>
			<p>&copy; 2024 Ticket System. All rights reserved.</p>
		</div>
	</div>
</body>
</html>
`
