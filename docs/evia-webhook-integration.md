# Evia Sign Webhook Integration

This document describes the current Evia Sign webhook flow used for document signature status updates in KH Rentals.

## Overview

Evia Sign sends webhook events when documents are:

1. Received for signature (`SignRequestReceived`)
2. Signed by a signatory (`SignatoryCompleted`)
3. Completed by all signatories (`RequestCompleted`)

These events are stored in the `webhook_events` table and processed to update agreement statuses automatically.

## Implementation Components

The webhook integration consists of:

1. **Server-side webhook endpoint**: Receives Evia Sign events and processes them
2. **Database table**: `webhook_events` stores received events
3. **Client-side integration**: `eviaSignService.js` sends documents for signing with the configured callback URL

## Webhook URL

Store the active callback target in:

```
VITE_EVIA_WEBHOOK_URL=https://your-app-hostname/api/evia/webhook
```

## Testing the Integration

Use the existing verification or webhook test scripts, or post a sample event directly to the configured webhook URL.

## Troubleshooting

If the webhook is not working:

1. Confirm the `webhook_events` table exists and matches the expected schema
2. Check application logs for webhook processing failures
3. Test direct API calls against the configured webhook URL
4. Verify the callback URL is included in outgoing Evia Sign requests

## Evia Sign Webhook Payloads

The webhook receives three types of payloads:

### 1. When a signing request is received (SignRequestReceived):
```json
{
  "RequestId": "c93fe389-cb3f-4a53-81d5-fa38b4077f98",
  "UserName": "Admin QA",
  "Email": "user@example.com",
  "Subject": "Rental Agreement",
  "EventId": 1,
  "EventDescription": "SignRequestReceived",
  "EventTime": "2023-08-31T05:55:55.2975393Z"
}
```

### 2. When a signatory completes signing (SignatoryCompleted):
```json
{
  "RequestId": "c93fe389-cb3f-4a53-81d5-fa38b4077f98",
  "UserName": "John Doe",
  "Email": "john@example.com",
  "Subject": "Rental Agreement",
  "EventId": 2,
  "EventDescription": "SignatoryCompleted",
  "EventTime": "2023-08-31T05:56:06.8342123Z"
}
```

### 3. When the request is completed (RequestCompleted):
```json
{
  "RequestId": "c93fe389-cb3f-4a53-81d5-fa38b4077f98",
  "UserName": "John Doe",
  "Email": "john@example.com",
  "Subject": "Rental Agreement",
  "EventId": 3,
  "EventDescription": "RequestCompleted",
  "EventTime": "2023-08-31T05:56:20.1064458Z",
  "Documents": [
    {
      "DocumentName": "Rental Agreement.pdf",
      "DocumentContent": "JVBERi0xLjcNCiW1tb..." // Base64 encoded PDF
    }
  ]
}
```

The `Documents` array is only included when `CompletedDocumentsAttached` is set to `true` in the original request. 