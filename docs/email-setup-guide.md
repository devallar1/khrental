# Email Setup Guide for KH Rentals

This document provides the current setup for email functionality in KH Rentals.

## Overview

KH Rentals uses:

1. **Primary Method**: SendGrid through the backend `/api/send-email` endpoint
2. **Fallback Method**: local simulation or configured fallback logic for development/testing flows

## Prerequisites

- A SendGrid account with an API key
- Access to your deployment environment settings

## Required Environment Variables

Configure these in local `.env` files and in your deployment target:

```
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=KH Rentals
VITE_API_ENDPOINT=https://your-app-hostname
```

## Testing

1. Run the application locally
2. Trigger an invitation or notification flow
3. Check the server logs for `/api/send-email`
4. Confirm delivery in SendGrid activity/history

## Troubleshooting

1. **Emails not sending**
   - Verify `SENDGRID_API_KEY`
   - Verify sender authentication in SendGrid
   - Check server logs for delivery errors

2. **Emails going to spam**
   - Complete SPF/DKIM/domain authentication in SendGrid

3. **Reset or invite links not working**
   - Verify the application base URL and API endpoint values

## Implementation Notes

- `directEmailService.js` handles direct email sending
- `notificationService.js` handles higher-level notification flows
- invitation flows call into the backend email path rather than a third-party browser SDK