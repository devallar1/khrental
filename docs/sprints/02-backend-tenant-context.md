# Sprint 02 - Backend Tenant Context

## Goal
Make the backend tenant-aware while preserving current single-tenant behavior for existing users.

## Objectives
- resolve active tenant at request time
- validate user membership
- attach tenant context to protected requests

## Scope
- middleware
- auth/session resolution
- backend request contracts

## Work Items
- add tenant context middleware
- resolve authenticated user and memberships
- support active tenant selection for users with one or many memberships
- attach `req.user`, `req.tenantId`, and `req.membership`
- add helper utilities for tenant validation
- add audit logging for tenant-sensitive requests

## Deliverables
- tenant context middleware
- membership resolution helpers
- backend request contract documentation

## Implementation Notes
- Added shared backend tenant-context resolution in [src/api/tenant/context.js](../../src/api/tenant/context.js)
- Added client-side request-context storage helpers in [src/services/requestContext.js](../../src/services/requestContext.js)
- Wired automatic identity and tenant headers into:
	- [src/services/platformClientCore.js](../../src/services/platformClientCore.js)
	- [src/services/mssqlApiClient.js](../../src/services/mssqlApiClient.js)
- Hydrated auth state with backend tenant context in [src/hooks/useAuth.jsx](../../src/hooks/useAuth.jsx)
- Exposed backend context endpoints:
	- [src/api/mssql/router.js](../../src/api/mssql/router.js)
	- [src/api/platform/router.js](../../src/api/platform/router.js)
- Documented the backend request contract in [src/api/README.md](../../src/api/README.md)
- Fixed compatibility exports in [src/services/platformClient.js](../../src/services/platformClient.js) and [src/services/platformClientCore.js](../../src/services/platformClientCore.js) so the Node runtime can load the platform facade cleanly
- Validated tenant-context resolution end-to-end against local Docker MSSQL using seeded test user and membership data

## Current Status
- Completed
- Middleware, request-contract groundwork, and local endpoint validation are complete
- Full repository-level tenant scoping remains part of Sprint 03

## Acceptance Criteria
- protected endpoints can resolve active tenant reliably
- single-membership users continue to work without extra steps
- tenant context is available to repository and service layers

## Dependencies
- Sprint 01 schema changes

## Risks
- ambiguous tenant selection for multi-membership users
- inconsistent auth context across routes
