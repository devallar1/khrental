# Sprint 05 - Frontend Tenant Context

## Goal
Expose tenant-aware behavior in the UI while keeping the experience simple for single-tenant users.

## Objectives
- add tenant-aware auth state
- support tenant switching
- propagate active tenant through service calls

## Scope
- auth context
- app context
- tenant switch UX
- route protection

## Work Items
- extend auth context with memberships and active tenant
- add tenant bootstrap after login
- add tenant switcher for multi-membership users
- persist active tenant safely in session/local state
- update service calls and page loaders to use active tenant context
- add UX for empty, unauthorized, and switch states

## Deliverables
- tenant-aware frontend context
- tenant switcher UI
- updated API client behavior

## Acceptance Criteria
- multi-membership users can switch tenants safely
- single-tenant users see minimal UX change
- active tenant is reflected consistently across the app

## Dependencies
- Sprint 02 backend tenant context
- Sprint 03 repository isolation

## Risks
- stale cached data after tenant switching
- hidden pages using unscoped local state

## Implementation Notes
- Extended `src/hooks/useAuth.jsx` to expose tenant-aware frontend state, including `activeTenant`, `activeTenantId`, `membership`, `memberships`, `hasTenantAccess`, `hasMultipleTenants`, `switchTenant()`, and `refreshTenantContext()`.
- Tenant bootstrap now normalizes backend tenant context into a consistent frontend auth shape even when only partial membership data is available.
- Added local tenant-switch loading state so the UI can disable tenant changes while the active tenant is being updated.
- Added `src/components/common/TenantSwitcher.jsx` as the shared tenant UX component.
- Added tenant-scoped app remount behavior in `src/App.jsx` so route trees and shared providers refresh when the active tenant changes.
- Scoped the React Query client per active tenant in `src/App.jsx` so cached query data does not bleed across tenant switches.
- Patched key legacy screens to explicitly refetch when `activeTenantId` changes and clear stale local page state:
	- `src/pages/PropertyList.jsx`
	- `src/pages/InvoiceList.jsx`
	- `src/pages/AgreementList.jsx`
	- `src/pages/MaintenanceList.jsx`
	- `src/pages/rentee/RenteePortal.jsx`
	- `src/pages/rentee/RenteeInvoices.jsx`
	- `src/pages/rentee/RenteeAgreements.jsx`
	- `src/pages/rentee/RenteeMaintenance.jsx`
	- `src/pages/rentee/RenteeUtilities.jsx`
- Patched remaining detail and utility renter/staff screens to refresh on tenant changes:
	- `src/pages/MaintenanceDetails.jsx`
	- `src/pages/rentee/RenteeMaintenanceDetails.jsx`
	- `src/pages/rentee/UtilityHistory.jsx`
	- `src/pages/rentee/UtilityReadingForm.jsx`
- Surfaced tenant context in staff and rentee layouts, plus the admin header:
	- `src/components/layouts/DashboardLayout.jsx`
	- `src/components/layouts/RenteePortalLayout.jsx`
	- `src/components/navigation/Header.jsx`
- Single-tenant users see a compact read-only tenant badge instead of a selector.
- Users without tenant membership now see an explicit "No tenant access assigned" state in the tenant UI areas.
- Tenant changes now remount the routed app shell after auth-context refresh so most mount-time loaders re-run without a full browser refresh.

## Validation Notes
- Verified the updated frontend builds successfully with `npm run build`.
- Confirmed the auth provider changes compile cleanly with no diagnostics in the touched files.
- Verified the tenant-refresh screen patches build successfully with `npm run build`.
- Verified the remaining detail-screen tenant-refresh patches build successfully with `npm run build`.

## Current Status
- Status: In progress
- Core frontend tenant context and the main long-tail tenant-refresh patches are implemented.
- Follow-up work should focus on broader manual regression coverage and any edge-case screens not yet exercised with multi-tenant data.
