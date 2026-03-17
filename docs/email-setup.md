# Email Configuration for KH Rentals

This document explains how to set up email sending for KH Rentals using SendGrid and the server-side `/api/send-email` endpoint.

## Why Use the Server Email Endpoint?

When sending emails from a web application, you should never call external APIs like SendGrid directly from the frontend because:

1. It would expose your API keys to the client-side code (a security risk)
2. Many API providers (including SendGrid) block browser-based calls due to CORS restrictions

Instead, the application uses the backend email endpoint to create a secure server-side hop that makes the SendGrid API call with proper authentication.

## Setup Instructions

### 1. Set Up a SendGrid Account

1. Sign up for a SendGrid account at [sendgrid.com](https://sendgrid.com/)
2. Create an API key with "Mail Send" permissions
3. Verify your sender domain and email addresses

### 2. Configure Server Environment Variables

Set the required values in your deployment environment or local `.env` file:

```
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@khrentals.com
EMAIL_FROM_NAME=KH Rentals
VITE_API_ENDPOINT=https://your-app-hostname
```

## Testing the Integration

After deploying, you can test whether the endpoint works by:

1. Accessing the Admin Dashboard
2. Inviting a new user (ensure "Simulate Email" is NOT checked)
3. Check that the email is sent successfully

## Troubleshooting

### Common Errors

#### CORS Errors
- If you see CORS errors in the console, check that the application server is reachable and the API endpoint is configured correctly.

#### "User ID not configured"
- If you see "EmailJS User ID not configured", this means the system is falling back to EmailJS but it's not properly configured. This should not happen if SendGrid is working correctly.

#### SendGrid API Errors
- If you see errors from the SendGrid API, check the error message and ensure your API key has proper permissions.

### Checking Logs

You can check the server logs for `/api/send-email` failures in your local terminal, Azure App Service logs, or hosting platform logs.

## Reverting to Development Mode

During local development, you can enable email simulation by setting the `simulated` parameter to `true` when calling `sendDirectEmail`. 