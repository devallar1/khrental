# Setting Up Evia Sign Webhook Integration

This guide covers the current webhook setup for KH Rentals.

## Prerequisites

- Node.js and npm
- A deployed application server or dedicated webhook host
- Database access for the `webhook_events` table

## Step 1: Prepare the Database

Ensure the `webhook_events` table exists and includes the columns expected by the current webhook processor.

## Step 2: Deploy the Webhook Endpoint

Deploy the application server and confirm the Evia webhook endpoint is publicly reachable.

## Step 3: Update Evia Sign Configuration

Set the callback URL in Evia Sign to the active server endpoint, for example:

```
https://your-app-hostname/api/evia/webhook
```

## Step 4: Test the Integration

1. Send a test webhook event with your existing test script or `curl`
2. Confirm a record is written to `webhook_events`
3. Send a real agreement for signing and verify status updates

## Troubleshooting

1. Verify the callback URL is correct
2. Check server logs for webhook errors
3. Confirm agreement records contain the correct Evia reference values
4. Confirm the database schema matches the expected webhook processor shape