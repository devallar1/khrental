# Sprint 03 - Data Access Isolation

## Goal
Enforce tenant isolation in the repository and data access layer.

## Objectives
- scope all tenant-owned queries by `tenant_id`
- prevent cross-tenant reads and writes
- validate cross-entity ownership

## Scope
- repositories
- domain services
- write validation

## Work Items
- update repository methods to require `tenantId`
- enforce `WHERE tenant_id = @tenantId`
- validate referenced entities belong to the same tenant
- update write flows for properties, agreements, invoices, maintenance, and notifications
- add negative tests for cross-tenant access

## Deliverables
- tenant-aware repositories
- ownership validation helpers
- isolation test coverage

## Implementation Notes
- Added tenant-scoping helpers and ownership validation in [src/api/mssql/repositories.js](../../src/api/mssql/repositories.js)
- Updated [src/api/mssql/router.js](../../src/api/mssql/router.js) to require authenticated tenant context for business routes after `/me` and `/tenant-context`
- Scoped these repository flows by `tenantId`:
	- app users
	- properties
	- property units
	- agreement templates
	- invoices
	- agreements
- Added cross-entity validation for agreement and invoice writes so referenced rows must belong to the active tenant
- Validated tenant-scoped lookup behavior locally:
	- tenant-scoped app-user lookup succeeds for the active tenant
	- invalid `x-tenant-id` override is rejected with `TENANT_ACCESS_DENIED`

## Current Status
- In progress
- Core repository scoping groundwork is complete
- Additional domain-service and platform-query hardening remains ahead

## Acceptance Criteria
- tenant-owned data cannot be read across tenant boundaries
- cross-tenant write attempts are rejected
- existing default-tenant flows continue to pass

## Dependencies
- Sprint 02 backend tenant context

## Risks
- hidden global queries outside repositories
- reporting endpoints that bypass normal data access patterns
