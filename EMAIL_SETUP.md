# KH Rentals - Email Setup Guide

This guide explains how to set up email sending for KH Rentals using the server-side email flow.

## Approach

Our application uses the backend email endpoint and server-side auth flow for secure email delivery. This approach:

1. Keeps API keys and credentials secure on the server side
2. Uses the application's current platform auth flow
3. Provides consistent user experiences for registration, login, and password resets

## Setting Up Email

To enable email sending for invitations, password resets, and other auth-related emails:

1. Set the required server environment variables
2. Configure your sender identity in SendGrid
3. Set up SMTP or API-based delivery details if required by your host:
   - **SMTP Host**: (from your email provider, e.g., `smtp.sendgrid.net` for SendGrid)
   - **SMTP Port**: Usually 587 for TLS
   - **SMTP Username**: (from your email provider)
   - **SMTP Password**: (from your email provider)
   - **Sender Email**: The email address emails will be sent from (e.g., `no-reply@khrentals.com`)
   - **Sender Name**: The name that will appear (e.g., `KH Rentals`)

## SendGrid Setup

If using SendGrid as your email provider:

1. Create an account on [SendGrid](https://sendgrid.com/)
2. Create an API key with "Mail Send" permissions
3. Use the verified sender identity and API key in your server configuration

## Testing

After setup:

1. Go to the Admin Dashboard
2. Try sending an invitation to a test user
3. Check that the email is received properly
4. Test password reset functionality

## Troubleshooting

If emails aren't being sent:

1. Check that server email credentials are correct
2. Verify that the sender email is authorized by your email provider
3. Look for error messages in application or hosting logs
4. Test by calling the invitation or password-reset flow from the app

## Contact

If you encounter any issues with the email setup, please contact the development team. 