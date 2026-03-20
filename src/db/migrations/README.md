# Database Migrations

This directory contains SQL migrations for the KH Rentals application. These scripts should be run in the specified order to update the database schema and fix any issues.

## How to Run Migrations

You can run the SQL migrations in one of two ways:

### 1. Using Your Database Management Tool

1. Connect to the active application database
2. Open a SQL editor/query window
3. Create a new query
4. Copy the contents of the migration file you want to run
5. Execute the query

### 2. Using Your Preferred SQL Tool

Run the migration file with the SQL tool used for your environment.

## Current Migrations

### Multi-tenant foundation for MSSQL

#### 20260317_01_create_multi_tenant_foundation.sql

**Purpose:** Introduces the non-breaking schema foundation for multi-tenancy in SQL Server by:
- creating `tenants`
- creating `tenant_memberships`
- creating `tenant_settings`
- adding nullable `tenant_id` columns to tenant-owned business tables
- adding indexes and safe foreign keys

**When to run this:** First step of Sprint 01 when starting the multi-tenant migration.

#### 20260317_02_backfill_default_tenant.sql

**Purpose:** Backfills the new multi-tenant schema by:
- creating a default tenant if needed
- assigning the default tenant to legacy business rows
- creating baseline memberships for existing internal users

**When to run this:** Immediately after `20260317_01_create_multi_tenant_foundation.sql`.

**Recommended order:**
1. `20260317_01_create_multi_tenant_foundation.sql`
2. `20260317_02_backfill_default_tenant.sql`

**Run with npm scripts:**
```bash
npm run migrate:tenant:foundation
npm run migrate:tenant:backfill
```

**Verification checks:**
- `SELECT id, name, slug FROM tenants;`
- `SELECT COUNT(*) AS unscoped_app_users FROM app_users WHERE tenant_id IS NULL;`
- `SELECT COUNT(*) AS unscoped_properties FROM properties WHERE tenant_id IS NULL;`
- `SELECT COUNT(*) AS memberships FROM tenant_memberships;`

### 1. Fix Utility Reading Rejection (202309015_fix_rejection_constraints.sql)

**Purpose:** Fixes issues with rejecting utility readings by:
- Updating database constraints for `utility_readings.billing_status`
- Adding additional validation and error handling
- Creating a stored procedure for reliable rejections
- Fixing inconsistent data

**When to run this:** If you're experiencing issues with rejecting readings, particularly with errors related to constraints or when the rejection doesn't properly update the status.

**How to run:**
```bash
# Run the SQL file in your database management tool or query editor
```

**Verification:** After running the migration, try rejecting a reading. You should see:
1. The reading's status changes to "Rejected"
2. The reading appears in the "Rejected" filter section 
3. No constraint violation errors appear in the console

## Troubleshooting

If you encounter issues running migrations:

1. **Permission errors**: Make sure you're using an account with the necessary permissions.
2. **Syntax errors**: Some older scripts in this directory were originally written for Postgres-style environments. The new multi-tenant foundation scripts are written for MSSQL. Confirm you are using the correct script set for the active database engine.
3. **Constraint errors**: If you see constraint violation errors, check for existing data that might violate new constraints.

For persistent issues, you can:
1. Run just the constraint update parts of the scripts
2. Check the database logs for detailed error messages
3. Use the fallback client-side implementation which tries multiple approaches to update records 