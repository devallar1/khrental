# Evia Sign Webhook Integration

This document explains how to set up and troubleshoot the Evia Sign webhook integration for the rental agreement signing functionality.

## Overview

The webhook allows Evia Sign to notify our application about signature events, including:
- When a signing request is sent
- When a signatory completes their signature
- When the entire signature request is completed

## Setup Instructions

### 1. Deploy the Webhook Endpoint

The webhook is handled by the application backend or dedicated deployment target. Deploy the server and confirm the Evia webhook URL points to the active server endpoint.

### 2. Configure Environment Variables

Make sure your `.env` file contains:

```
VITE_EVIA_WEBHOOK_URL=https://your-app-hostname/api/evia/webhook
```

### 3. Verify Server Permissions

Ensure the deployed backend can write to the `webhook_events` table and update agreement records.

## Testing the Webhook

You can test the webhook functionality with:

```bash
# Use a test request ID or an actual Evia Sign request ID
node scripts/test-evia-webhook.js [requestID]
```

Or make an HTTP request to your webhook URL:

```bash
curl -X POST https://your-app-hostname/api/evia/webhook \
  -H "Content-Type: application/json" \
  -d '{"RequestId":"test-123","EventId":1,"EventDescription":"SignRequestReceived","UserName":"Test User","Email":"test@example.com"}'
```

## Troubleshooting

### Common Issues

1. **Webhook URL Not Configured**
   - Check that `VITE_EVIA_WEBHOOK_URL` is correctly set in your .env file
   - Verify the URL can be reached with a simple curl test

2. **No Status Updates After Signing**
   - Check the application logs for webhook processing errors
   - Ensure the `eviasignreference` field is correctly set in your agreements table

3. **Authentication Errors**
   - The webhook endpoint should accept Evia callbacks without interactive user authentication
   - Verify any shared-secret or request validation settings on the server

4. **Database Update Failures**
   - Check function permissions for database access
   - Verify the agreements table structure matches what the webhook expects

## Manual Verification

You can manually check if a signature request was completed by using the checkSignatureStatus function:

```javascript
import { checkSignatureStatus } from '../services/eviaSignService';

// Replace with your actual request ID
const result = await checkSignatureStatus('your-request-id');
console.log(result);
```

## Webhook Event Schema

The Evia Sign webhook sends events with the following structure:

```javascript
{
  "RequestId": "c93fe389-cb3f-4a53-81d5-fa38b4077f98", // The Evia Sign request ID
  "UserName": "John Doe",
  "Email": "john@example.com",
  "Subject": "Rental Agreement",
  "EventId": 1, // 1=SignRequestReceived, 2=SignatoryCompleted, 3=RequestCompleted
  "EventDescription": "SignRequestReceived",
  "EventTime": "2023-03-31T05:55:55.2975393Z",
  "Documents": [] // Only included for RequestCompleted when CompletedDocumentsAttached=true
}
``` 