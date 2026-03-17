# Email Configuration

The application sends email for:
1. User invitations
2. Password reset links
3. Notification emails

## Environment Variables

Configure these in your `.env` file for local development and in your hosting environment for deployment:

| Variable | Description | Example |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | SendGrid API key used by the server | `SG.abc123...` |
| `EMAIL_FROM` | Sender email address | `noreply@yourcompany.com` |
| `EMAIL_FROM_NAME` | Sender name | `KH Rentals` |
| `VITE_API_ENDPOINT` | Public base URL for the app/API | `https://app.example.com` |

## Email Sending Approach

Email delivery is handled by the backend through `/api/send-email` so API keys stay on the server.

In development mode, some email flows may be simulated. Check the terminal logs for the exact behavior of the current environment.

## Testing Email Functionality

Use the built-in diagnostics pages and admin flows to verify configuration.

## Debugging Email Issues

If emails are not being sent correctly:

1. Check the browser console for client-side request errors
2. Verify server-side environment variables are set correctly
3. Use the diagnostics page to test configuration
4. Check application or hosting logs for `/api/send-email` failures

## Email Templates

The application uses HTML/text payloads built in application code and sent through the backend email service.