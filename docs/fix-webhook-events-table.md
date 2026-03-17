# Fixing the `webhook_events` Table

If webhook processing fails because expected columns are missing, update the `webhook_events` table so it matches the schema used by the current server-side webhook processor.

## Recommended Fix

1. Open your database management tool for the active environment
2. Compare the current `webhook_events` schema with the migration scripts in the repository
3. Apply the missing columns and indexes
4. Re-run a webhook test and confirm inserts succeed

## Validation

After applying the schema update:

1. Send a test webhook event
2. Verify the event is stored
3. Confirm agreement status updates continue without schema errors

6. Click "Run" to execute the script
7. Verify that you see the `processed` column in the results table at the bottom

## Option 2: Run Script Through Node.js

If you prefer, you can run this fix through our Node.js script:

```bash
node scripts/fix-webhook-table.js
```

## Preventing This Issue in the Future

This issue happens when the webhook_events table is created without the processed column. To prevent this:

1. Always use the `create_webhook_events_table.sql` script to create this table
2. When deploying new edge functions, make sure the database schema is up to date
3. Consider adding database schema checking to your CI/CD pipeline

## What This Fix Does

1. Adds the `processed` column (BOOLEAN, default FALSE) to the webhook_events table
2. Creates an index on the processed column for better query performance
3. Adds a Row Level Security policy to allow the service role to update events (mark them as processed)

After applying this fix, the webhook function should work properly. 