# Sprint 06 - Tenant-Scoped Storage

## Goal
Move new file activity into tenant-scoped storage paths without breaking existing files.

## Objectives
- isolate new uploads by tenant
- preserve read access to legacy file paths
- prepare asset migration tooling

## Scope
- storage path conventions
- upload/download services
- migration tooling

## Work Items
- define tenant-scoped path standards
- update upload services to write under tenant folders
- preserve reads from legacy paths during transition
- create migration tooling for old assets
- update file references in agreements, maintenance, invoices, and property media
- test end-to-end file workflows

## Deliverables
- tenant-scoped storage design
- updated file service behavior
- legacy file migration scripts

## Acceptance Criteria
- all new uploads are stored under tenant-scoped paths
- legacy files remain accessible
- no broken file references in key workflows

## Dependencies
- Sprint 03 data isolation
- Sprint 05 frontend tenant context

## Risks
- broken historical URLs
- partial migration causing duplicate or inconsistent file references

## Implementation Notes
- Added tenant-scoped storage path enforcement in `src/api/platform/router.js` for storage `list`, `upload`, and `delete` operations.
- Authenticated storage writes now resolve under `tenants/<tenantId>/...` automatically.
- Cross-tenant storage path overrides are rejected with a `403` error.
- Updated `src/services/platformClientCore.js` so storage client operations scope relative paths to the active tenant before upload, listing, download, public URL generation, and deletion.
- Updated `src/services/fileService.js` so uploaded file URLs are generated from the returned scoped storage path instead of the legacy unscoped path.
- Patched direct/manual upload flows so they now persist public URLs from the scoped upload path returned by storage operations instead of assuming a legacy unscoped relative path:
	- `src/services/paymentService.js`
	- `src/pages/rentee/UtilityReadingForm.jsx`
	- `src/components/utilities/UtilityMeterForm.jsx`
	- `src/pages/RenteeForm.jsx`
	- `src/services/agreementService.js`
	- `src/services/eviaSignService.js`
	- `src/services/DocumentService.js`
- Added reusable validation coverage with `scripts/validate-tenant-storage.mjs` and the `npm run validate:tenant-storage` script.
- Added `scripts/migrate-legacy-storage-assets.mjs` plus the `npm run migrate:tenant-storage-assets` entry point to scan known legacy asset URL columns, copy files into tenant-prefixed folders, and optionally update MSSQL references with `--apply`.
- The migration scan now covers additional tenant-owned asset fields in `app_users` and JSON-backed property media arrays in `properties.images`.
- The script now tolerates partial local schemas by checking MSSQL metadata before querying each target and skipping unavailable tables or columns instead of failing.
- Updated `src/components/agreements/AgreementFormContainer.jsx` so new agreement saves no longer persist inline HTML into `documenturl`; HTML remains in `processedcontent` until a real generated document URL exists.
- Updated `scripts/migrate-legacy-storage-assets.mjs` so inline HTML payloads are classified separately as `htmlContent` instead of generic unsupported values.
- Removed the remaining `user_profiles` dependency from active profile flows:
	- `src/pages/UserProfile.jsx` now reads and writes profile data through `app_users`
	- `src/components/layouts/DashboardLayout.jsx` now stores language preference locally instead of writing to `user_profiles`
	- `src/hooks/useAuth.jsx` now hydrates `preferred_language` from local storage for the active user
- Added `src/utils/userPreferences.js` to centralize preferred-language persistence outside the removed legacy profile table.
- Legacy public reads remain available because static file serving still exposes existing non-tenant paths under `/storage/...`.

## Validation Notes
- Verified the touched storage files compile cleanly with no diagnostics.
- Verified the application still builds successfully with `npm run build` after the tenant-scoped storage groundwork.
- Verified the patched direct upload flows still build successfully with `npm run build`.
- Verified tenant-scoped storage behavior locally with `npm run validate:tenant-storage`:
	- authenticated uploads are written under `tenants/<tenantId>/...`
	- storage listing resolves the tenant-scoped directory
	- cross-tenant path override attempts are rejected with `TENANT_STORAGE_OVERRIDE_BLOCKED`
	- scoped delete requests clean up the uploaded file successfully
- Added a dry-run capable legacy asset migration script covering `maintenance_request_images.image_url`, `utility_readings.photourl`, `invoices.paymentproofurl`, agreement document/signature URL variants (`documenturl`, `signeddocumenturl`, `signed_document_url`, `signatureurl`, `signature_pdf_url`, `pdfurl`), `app_users.id_copy_url`, `app_users.profile_image_url`, and `properties.images`.
- Verified the migration script handles root-relative legacy URLs like `/storage/images/...`.
- Verified apply-mode migration locally with temporary seeded fixtures for `app_users` and `properties.images`:
	- legacy files were copied into `tenants/<tenantId>/...`
	- stored MSSQL URLs were rewritten to tenant-prefixed public paths
	- JSON-backed property image arrays were updated in-place
	- temporary validation fixtures were removed after the check
- Completed a remaining URL-field audit across the MSSQL repository layer and service workflows.
- Audit result: the main known tenant-owned persisted storage fields are now covered by the migration script.
- Remaining caveats from the audit:
	- `agreements.documenturl` can still contain inline HTML content in some flows, so non-URL values will remain intentionally unsupported by the migration script.
- `user_profiles.profile_image_url` has been removed from the active dashboard/profile flows, but historical legacy references should still be avoided in future changes.
- Historical inline-HTML `agreements.documenturl` records are now treated as compatibility-only:
	- existing records can still render because the agreement viewer already supports inline HTML payloads
	- new saves no longer write inline HTML into `documenturl`
	- the migration script reports these rows as `htmlContent` for visibility, but does not attempt file-copy conversion
- Verified the updated migration report still runs successfully with `npm run migrate:tenant-storage-assets` after adding explicit inline-HTML classification.
- Verified the application still builds successfully with `npm run build` after stopping new agreement saves from writing inline HTML into `documenturl`.
- Verified the application still builds successfully with `npm run build` after removing the active `user_profiles` dependency from dashboard/profile flows.

## Current Status
- Status: In progress
- Core tenant-scoped path enforcement for new storage activity is implemented.
- Legacy asset migration tooling is now in place; follow-up work should focus on running it against richer legacy data and broader regression validation.
