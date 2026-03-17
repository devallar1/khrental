# Manual Webhook Deployment Guide

If automated deployment is unavailable, deploy the webhook manually by deploying the application server or dedicated webhook host and then updating Evia Sign to use the active callback URL.

## 1. Deploy the Server

Deploy the application or webhook service to the target hosting environment.

## 2. Confirm the Endpoint

Verify the active webhook URL, for example:

```
https://your-app-hostname/api/evia/webhook
```

## 3. Test the Webhook

```bash
curl -X POST https://your-app-hostname/api/evia/webhook \
   -H "Content-Type: application/json" \
   -d '{"RequestId":"test-123","EventId":1,"EventDescription":"SignRequestReceived","UserName":"Test User","Email":"test@example.com"}'
```

## 4. Check Logs

Review application or hosting logs for successful receipt and processing.

## 5. Verify the Database

Confirm the `webhook_events` table exists and new rows are written during tests.

## 6. Update Configuration

Make sure your `.env` file or hosting configuration contains:

```
VITE_EVIA_WEBHOOK_URL=https://your-app-hostname/api/evia/webhook
```