# Email Notifications Setup Guide

This guide explains how to configure and use the email notification system in the ticket-system application.

## Features

The email notification system automatically sends:
- **Ticket Confirmation Emails** - Sent immediately after booking is completed
- **Event Reminder Emails** - Can be sent 24 hours before an event (requires cron job setup)

## Configuration

Email notifications require SMTP server configuration via environment variables.

### Environment Variables

Add these to your backend `.env` file or environment configuration:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # SMTP server hostname
SMTP_PORT=587                      # SMTP server port (usually 587 for TLS)
SMTP_USER=your-email@gmail.com     # SMTP username (email address)
SMTP_PASSWORD=your-app-password    # SMTP password or app-specific password
FROM_EMAIL=noreply@yourdomain.com  # Email address to send from
FROM_NAME="Your Event Platform"    # Name displayed as sender
```

### Gmail Setup (Example)

If using Gmail as your SMTP provider:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account Settings → Security
   - Select "App passwords" (under 2-Step Verification)
   - Select "Mail" and your device
   - Copy the generated 16-character password
3. **Configure environment**:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop  # The app password from step 2
   FROM_EMAIL=your-email@gmail.com
   FROM_NAME="Ticket System"
   ```

### Other SMTP Providers

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

**Mailgun:**
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
```

## Email Templates

The system includes two HTML email templates:

### 1. Ticket Confirmation Email
Sent automatically when a booking is completed. Includes:
- Event details (title, date, time, venue)
- Booking reference number
- List of all tickets with codes
- Seat information (if applicable)
- Total amount paid

### 2. Event Reminder Email
Can be sent 24 hours before an event. Includes:
- Event details and timing
- Venue information with address
- Door opening time
- Ticket count and booking reference
- Pre-event checklist

## Testing Email Configuration

### Local Testing

1. Start the backend with email configuration:
   ```bash
   cd backend
   export SMTP_HOST=smtp.gmail.com
   export SMTP_PORT=587
   export SMTP_USER=your-email@gmail.com
   export SMTP_PASSWORD=your-app-password
   export FROM_EMAIL=your-email@gmail.com
   export FROM_NAME="Test Ticket System"

   go run main.go
   ```

2. Make a test booking through the frontend
3. Check your email inbox for the confirmation email

### Graceful Degradation

If email is not configured (missing SMTP credentials), the system will:
- Log a message: `Email service not configured, skipping email to <email>`
- Continue processing the booking successfully
- Not fail the booking due to email errors

This allows development and testing without requiring email setup.

## Production Deployment

### Kubernetes/Docker

Add email configuration to your deployment:

**Docker Compose:**
```yaml
services:
  backend:
    environment:
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - FROM_EMAIL=${FROM_EMAIL}
      - FROM_NAME=Ticket System
```

**Kubernetes Secret:**
```bash
kubectl create secret generic email-config \
  --from-literal=smtp-host=smtp.gmail.com \
  --from-literal=smtp-port=587 \
  --from-literal=smtp-user=your-email@gmail.com \
  --from-literal=smtp-password=your-app-password \
  --from-literal=from-email=noreply@yourdomain.com \
  --from-literal=from-name="Ticket System"
```

**Deployment YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ticket-system-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        env:
        - name: SMTP_HOST
          valueFrom:
            secretKeyRef:
              name: email-config
              key: smtp-host
        - name: SMTP_PORT
          valueFrom:
            secretKeyRef:
              name: email-config
              key: smtp-port
        # ... other variables
```

## Event Reminders (Optional)

To automatically send event reminders 24 hours before events, set up a cron job:

### Option 1: Kubernetes CronJob

Create a CronJob that calls the reminder endpoint:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: event-reminders
spec:
  schedule: "0 10 * * *"  # Run daily at 10 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reminder-sender
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              curl -X POST http://ticket-system-backend:8080/api/v1/admin/send-reminders \
                -H "Authorization: Bearer $ADMIN_TOKEN"
          restartPolicy: OnFailure
```

### Option 2: External Cron

Set up a cron job on any server:

```bash
# Add to crontab (crontab -e)
0 10 * * * curl -X POST https://your-api.com/api/v1/admin/send-reminders -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Troubleshooting

### Emails Not Sending

1. **Check Configuration**:
   ```bash
   # In backend container/pod
   echo $SMTP_USER
   echo $SMTP_HOST
   ```

2. **Check Logs**:
   ```bash
   # Look for email-related messages
   kubectl logs -f deployment/ticket-system-backend | grep -i email
   ```

3. **Test SMTP Connectivity**:
   ```bash
   telnet smtp.gmail.com 587
   ```

### Gmail Blocking Emails

- Ensure 2FA is enabled
- Use App Password, not regular password
- Check "Less secure app access" is not required (deprecated)
- Verify email isn't in spam folder

### Rate Limiting

Most SMTP providers have rate limits:
- **Gmail**: 500 emails/day for free accounts
- **SendGrid**: Varies by plan
- **AWS SES**: Production access required for high volumes

Consider using a professional email service for high-volume applications.

## Customization

### Modify Email Templates

Edit templates in `backend/services/email_service.go`:

```go
const ticketConfirmationTemplate = `
<!DOCTYPE html>
<html>
<!-- Your custom HTML template -->
</html>
`
```

### Add New Email Types

1. Create a new data structure:
   ```go
   type CustomEmailData struct {
       Field1 string
       Field2 string
   }
   ```

2. Add a new sender method:
   ```go
   func (s *EmailService) SendCustomEmail(to string, data CustomEmailData) error {
       // Implementation
   }
   ```

3. Call it where needed in your service layer

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use app-specific passwords** instead of account passwords
3. **Rotate SMTP credentials** regularly
4. **Monitor email sending** for abuse
5. **Implement rate limiting** on booking endpoints
6. **Use environment-specific configs** (dev vs prod)
7. **Consider email queue** for high-volume applications

## Support

For issues or questions:
- Check backend logs for error messages
- Verify SMTP credentials are correct
- Test SMTP connectivity separately
- Ensure firewall allows outbound SMTP traffic (port 587)
