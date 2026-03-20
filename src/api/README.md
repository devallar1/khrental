# API Structure

## Webhook Implementation

The webhook system has been refactored to follow a more organized and simplified structure:

### Core Implementation

- `src/api/evia-sign/webhookHandler.js` - Contains the core implementation of webhook handling logic
- `src/api/evia-sign/index.js` - Exports the webhook handlers as part of the evia-sign module

### API Routes

- `src/api/routes/index.js` - Contains all route handlers including the webhook handler

### NextJS API Route

- `src/pages/api/evia-webhook.js` - NextJS API route that receives Evia Sign webhook requests

## Import Structure

All components should now import from the centralized index files rather than directly from implementation files:

```js
// Correct imports for webhook handlers
import { webhookRequestHandler } from '../api/evia-sign';
import { handleWebhookRequest } from '../api/routes';

// Avoid direct imports from implementation files
// Don't do this:
import { webhookRequestHandler } from '../api/evia-sign/webhookHandler';
```

## Code Organization Principles

The refactoring follows these key principles:

1. **Single Source of Truth**: Each function is implemented in only one place
2. **Centralized Exports**: All exports are centralized in index files
3. **Clear Responsibilities**: 
   - Core implementation: `webhookHandler.js`
   - API route handling: `routes/index.js`
   - NextJS entry point: `pages/api/evia-webhook.js`

This structure ensures that:

1. There's a single source of truth for each component
2. Implementation details can change without affecting consuming code
3. Dependencies are clearly expressed through the index files
4. Code is not duplicated across the application

## Tenant Context Request Contract

Sprint 02 introduces backend tenant-context resolution for the local API surface.

### Identity Headers

Protected or tenant-aware requests can provide:

- `x-auth-id`: authenticated auth user id
- `x-user-id`: direct app user id fallback
- `x-user-email`: email fallback for user lookup
- `x-tenant-id`: requested active tenant id for multi-membership users

### Resolution Behavior

When the backend receives an authenticated request, it now attempts to:

1. resolve the current `app_users` record
2. load active `tenant_memberships`
3. auto-select the tenant when the user has one membership
4. prefer an explicit `x-tenant-id` when provided
5. fall back to the user record `tenant_id` for legacy single-tenant compatibility

### Context Endpoints

- `GET /api/mssql/me`
   - returns the current user plus `tenantId`, `tenant`, `membership`, and `memberships`
- `GET /api/mssql/tenant-context`
   - returns resolved backend tenant context for the current user
- `GET /api/platform/auth/context`
   - returns the same tenant context through the platform compatibility layer

### Response Metadata

`/api/platform/query` and `/api/platform/rpc/:name` now include tenant-context metadata under `meta.tenantContext` so tenant resolution can be inspected without changing existing `data` payload contracts.