# Sprint 09 - Tenant Admin UI and Federated Auth

## Goal
Enable administrators to manage tenants from the application UI and support Google and Microsoft sign-in for local and hosted tenant users.

## Objectives
- create a dedicated tenant administration experience for platform administrators
- allow tenant creation, editing, activation, and membership assignment from the UI
- add Google and Microsoft login as supported authentication methods
- preserve tenant isolation and membership-driven access during federated sign-in

## Scope
- tenant administration UI
- tenant CRUD workflows
- membership assignment and default-tenant selection
- local and hosted authentication UX updates
- Google login integration
- Microsoft login integration

## Work Items
- define the tenant admin information architecture and route structure
- create tenant list, tenant details, and tenant creation screens
- add membership management flows for assigning app users to tenants with roles
- add validation for duplicate slugs, inactive tenants, and invalid membership changes
- expose safe backend routes or platform operations for tenant and membership management
- add Google OAuth sign-in support in the auth UI and backend configuration flow
- add Microsoft OAuth sign-in support in the auth UI and backend configuration flow
- map federated identities to existing `app_users` rows and tenant memberships without breaking current email-based accounts
- define account-linking and first-login behavior when a federated identity does not yet have an `app_users` record
- document required environment variables, callback URLs, and provider setup for local Docker and hosted deployments

## Delivery Phases

### Phase 1 - Tenant Admin Backend Foundation
- define the tenant admin permission boundary and route protection rules
- add safe tenant CRUD endpoints or platform operations for `tenants`, `tenant_settings`, and `tenant_memberships`
- add validation for slug uniqueness, protected default-tenant behavior, and membership integrity
- define server responses for users with no memberships or inactive tenants

### Phase 2 - Tenant Admin UI
- create admin routes for tenant list, tenant details, tenant create, and membership management
- add forms for tenant metadata, activation status, and default-membership selection
- add search, filtering, empty states, and permission-aware action visibility
- verify tenant switcher behavior after membership edits

### Phase 3 - Federated Auth Foundation
- choose the supported identity flow for Google and Microsoft in local and hosted environments
- add environment variables, provider metadata, redirect handling, and callback validation
- design identity-linking rules for existing email/password users versus new provider-based users
- define onboarding behavior when a federated user authenticates before any tenant membership exists

### Phase 4 - Federated Auth UX and Hardening
- add Google and Microsoft login buttons to the auth entry points
- implement callback handling, account linking, and post-login tenant resolution
- add regression coverage for sign-in, sign-out, tenant switching, and no-membership flows
- document local Docker setup, hosted setup, and operational troubleshooting

## Suggested Ticket Breakdown
- `S09-T1` tenant admin route and permission design
- `S09-T2` backend tenant CRUD support
- `S09-T3` backend membership assignment support
- `S09-T4` tenant list and create UI
- `S09-T5` tenant details and edit UI
- `S09-T6` tenant membership management UI
- `S09-T7` Google auth provider integration
- `S09-T8` Microsoft auth provider integration
- `S09-T9` federated identity linking and onboarding rules
- `S09-T10` docs, environment setup, and regression validation

## Recommended Execution Order
1. complete `S09-T1` through `S09-T3` so tenant admin actions exist behind safe backend contracts
2. deliver `S09-T4` through `S09-T6` so admins can manage tenants and memberships without SQL access
3. complete `S09-T7` through `S09-T9` so federated auth lands on top of stable tenant-aware admin flows
4. finish `S09-T10` with environment validation and regression coverage

## Deliverables
- tenant administration screens for admins
- working tenant create and update workflows
- working tenant membership management flows
- Google sign-in support
- Microsoft sign-in support
- authentication and tenant-admin setup documentation

## Acceptance Criteria
- an admin can create a tenant and edit its basic metadata from the UI
- an admin can assign and remove tenant memberships without direct SQL access
- an admin can set or change a user's default tenant through the UI
- Google and Microsoft sign-in both work end to end in the supported environments
- federated sign-in resolves the correct `app_users` record and active tenant context
- users without tenant access receive a controlled onboarding or no-access state rather than a broken dashboard

## Dependencies
- Sprint 02 backend tenant context
- Sprint 03 data access isolation
- Sprint 05 frontend tenant context
- Sprint 07 tenant settings and integrations

## Risks
- identity-linking conflicts between existing email/password users and new federated accounts
- provider callback and environment differences between Docker, local browser testing, and hosted deployment
- accidental overexposure of tenant-management actions if admin permissions are not enforced consistently
- UX complexity around users who belong to multiple tenants or arrive through social login before membership assignment

## Notes
- tenant admin UI should target true platform-admin workflows, not just per-tenant settings screens
- federated auth should not replace email/password immediately; it should coexist until account-linking behavior is proven safe
- local Docker testing should treat provider callbacks and redirect URLs as first-class acceptance criteria rather than a late-stage deployment concern