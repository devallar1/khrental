# Sprint 04 - Platform API Hardening

## Goal
Prevent generic platform endpoints from bypassing tenant isolation.

## Objectives
- harden generic query access
- restrict unsafe RPC behavior
- block tenant scope overrides from clients

## Scope
- `/api/platform/query`
- `/api/platform/rpc`
- raw SQL and generic access controls

## Work Items
- inject tenant filters automatically for tenant-owned tables
- reject client-supplied tenant overrides
- restrict raw SQL usage in standard runtime paths
- whitelist allowed RPC operations
- add monitoring and logs for rejected requests

## Deliverables
- hardened platform API rules
- whitelist and restriction policy
- tenant-safe enforcement tests

## Acceptance Criteria
- generic endpoints cannot bypass tenant isolation
- unsafe operations are blocked or admin-only
- tenant-owned access is enforced consistently

## Dependencies
- Sprint 03 data access isolation

## Risks
- legacy flows relying on unrestricted generic queries
- operational scripts that need a separate admin-only path

## Implementation Notes
- Added tenant-aware guards to `src/api/platform/router.js` for generic `select`, `insert`, `update`, `delete`, and `upsert` actions.
- Tenant-owned tables now receive automatic `tenant_id` filter injection for reads and automatic `tenant_id` payload enforcement for writes.
- Client-supplied `tenant_id` filters or payload overrides are rejected with `TENANT_OVERRIDE_BLOCKED`.
- Relation loading in augmented platform responses now applies tenant filters when the related table is tenant-scoped.
- Added RPC restrictions so only approved runtime RPCs are allowed through the generic platform surface.
- Authenticated runtime calls to `exec_sql` are now blocked with `RPC_BLOCKED`.
- Rejected platform requests are logged with method, path, tenant, user, and rejection reason to improve monitoring and incident review.
- Updated `server.js` error handling so explicit platform authorization failures return their intended HTTP status and error code.

## Validation Notes
- Verified authenticated tenant-scoped `/api/platform/query` requests still succeed for allowed rows.
- Verified client attempts to force a different `tenant_id` through `/api/platform/query` return HTTP `403` with `TENANT_OVERRIDE_BLOCKED`.
- Verified authenticated `/api/platform/rpc/exec_sql` requests return HTTP `403` with `RPC_BLOCKED`.

## Current Status
- Status: In progress
- Core platform-query and RPC tenant-bypass protections are implemented and validated locally.
- Follow-up work should focus on any remaining legacy/admin-only generic flows and wider regression coverage.
