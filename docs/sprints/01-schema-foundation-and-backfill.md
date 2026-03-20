# Sprint 01 - Schema Foundation and Backfill

## Goal
Introduce the database structures required for multi-tenancy without breaking the current application.

## Objectives
- add new tenant tables
- add `tenant_id` to tenant-owned entities
- backfill current data into a default tenant
- add indexes and constraints

## Scope
- database schema only
- no visible behavior change to users
- Docker-friendly execution of migrations and backfill scripts

## Work Items
- create `tenants`
- create `tenant_memberships`
- create `tenant_settings`
- add nullable `tenant_id` to all tenant-owned tables
- create a default tenant
- backfill existing rows with the default tenant
- create initial memberships for current internal users
- add `tenant_id` indexes and foreign keys
- verify migration scripts can run reliably from a containerized app/tooling workflow

## Deliverables
- schema migration scripts
- backfill scripts
- validation queries
- rollback scripts
- container execution notes for migration and backfill operations

## Acceptance Criteria
- all existing business data has a valid tenant mapping
- current app remains functional after migration
- no failed backfill records remain unresolved
- migration steps are documented for Docker-based local execution

## Dependencies
- Sprint 00 design approval

## Risks
- hidden tables missed from the backfill
- cross-table relationships that need cleanup before constraints are enabled
