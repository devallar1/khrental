# Evia Sign Webhook Solution

## Issues Identified

The webhook flow previously suffered from:

1. Request validation mismatches
2. Inconsistent `webhook_events` schema assumptions
3. Invalid status updates during agreement processing

## Current Solution

The webhook flow now relies on the application server or dedicated webhook host, with safer processing around schema differences and status updates.

## Action Required

To validate the current setup:

1. Deploy the current application server or webhook host
2. Test the webhook endpoint with a sample Evia request
3. Verify `CallbackUrl` points to the active webhook endpoint
4. Ensure `CompletedDocumentsAttached` is enabled when signed documents should be returned

## Verification

1. Send a test event
2. Confirm records appear in `webhook_events`
3. Send a real document for signing and confirm agreement status updates

## Monitoring

Use application logs, hosting logs, and database inspection to monitor webhook processing.