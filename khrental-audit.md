# KH Rentals — Codebase Audit & Migration Architecture

**Date:** 2026-03-21
**Source repo:** `C:\repo\khrental` (cloned from WasanthaK/khrental)
**Target:** SvelteKit 5 + PostgreSQL, self-hosted on NucBox

---

## 1. What Exists Today

### Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + MUI + Bootstrap (yes, all three)
- **Backend:** Express.js (`server.js`) acting as API proxy + email sender + Evia Sign token exchange
- **Database:** MSSQL (SQL Server) — the real backend, accessed via `mssql` npm package through a custom query builder
- **Auth:** Custom auth shim in `platformClientCore.js` that mimics Supabase's client API but routes everything through the Express server to MSSQL
- **Storage:** Local filesystem (`public/storage/`) with a Supabase-style storage API abstraction
- **Email:** Twilio SendGrid
- **Digital signatures:** Evia Sign (Sri Lankan e-signature service, OAuth2 flow)
- **Deployment:** Docker → Azure (with Vite build for production)

### Database Schema (MSSQL, ~20 tables)

**Core domain:**
- `properties` — rental properties with bank details, utility rates, amenities
- `property_units` — individual units within properties (floor, bedrooms, bathrooms, own bank details)
- `app_users` — unified user table (merged from old `team_members` + `rentees` tables). Roles: admin, staff, manager, maintenance_staff, finance_staff, supervisor, rentee
- `agreements` — rental agreements linking rentee → property/unit, with Evia Sign integration (signature_status, signatories_status as JSONB, PDF URLs)
- `agreement_templates` — rich text templates for generating agreement documents
- `invoices` — billing with JSONB `components` (rent, electricity, water, pastDues, taxes), auto-total via trigger
- `payments` — payment records linked to invoices
- `maintenance_requests` — with images table and comments table (separate related tables)
- `maintenance_request_images` — uploaded photos of maintenance issues
- `maintenance_request_comments` — threaded comments on requests

**Supporting:**
- `cameras` + `camera_monitoring` — CCTV tracking per property
- `notifications` — in-app notifications
- `scheduled_tasks` + `task_assignments` — recurring property tasks
- `letter_templates` + `sent_letters` — correspondence management
- `action_records` — audit log of property/rentee actions
- `utility_readings` + `utility_configs` — meter reading submissions and billing config
- `agreement_signature_status` — webhook-driven signature tracking from Evia

**Multi-tenant (recently added, March 2026):**
- `tenants` — tenant orgs with slug, status, plan
- `tenant_memberships` — user ↔ tenant mapping with role and is_default
- `tenant_settings` — per-tenant branding, email, storage, feature flags (all as JSON columns)
- Nullable `tenant_id` column added to all 21 domain tables

### Architecture Problems

**1. The Supabase Ghost**
The entire frontend was originally built against Supabase (PostgREST + Supabase Auth + Supabase Storage). At some point, the backend was migrated to MSSQL, but instead of rewriting the frontend, they built `platformClientCore.js` — a 600-line shim that reimplements the Supabase client API (`from().select().eq().single()`, `storage.from().upload()`, `auth.signInWithPassword()`) and routes everything through the Express server. The Express server then translates these into raw MSSQL queries. This means:
- Every database operation goes: **React → platformClient (Supabase-like API) → Express → MSSQL query builder → SQL Server**
- The query builder in `router.js` is essentially a hand-rolled ORM that parses Supabase-style select strings (including nested relations like `*, maintenance_request_images(*)`) and converts them to MSSQL JOINs
- There's a `RELATION_CONFIG` object that manually maps foreign key relationships for joined queries

**2. Dual Database Personality**
The codebase has two parallel data paths:
- `mssqlApiClient.js` — direct MSSQL API calls (used when `VITE_USE_MSSQL_API=true`)
- `platformClient.js` — the Supabase shim (fallback)
Every service checks `isMssqlApiEnabled()` and branches. The invoice service, for example, tries MSSQL first, catches errors, then falls back to the platform client.

**3. Auth Complexity**
- Custom auth store using JSON files on disk (`.local-auth-store.json`)
- Session persistence in localStorage via `requestContext.js`
- Dev bypass mode for skipping auth entirely
- Multi-tenant context resolved from headers (`x-tenant-id`, `x-auth-id`, `x-user-id`, `x-user-email`)
- The `useAuth` hook is ~400 lines with throttled state changes, profile normalization, tenant resolution, and a dev bypass role system

**4. UI Framework Salad**
- Tailwind CSS for utility classes
- MUI (Material UI v7) for components
- Bootstrap 5 + React Bootstrap for layout
- FontAwesome + Heroicons + React Icons (three icon libraries)
- TipTap for rich text editing (agreement templates)
- dnd-kit for drag-and-drop

**5. Accumulated Cruft**
- 46 pages, many duplicated across `/dashboard`, `/admin`, and `/portal` routes
- The rentee portal is duplicated under both `/rentee` and `/portal` paths (identical children)
- Invoice routes defined twice in the dashboard children
- Diagnostic pages, test pages, and debug tools shipped in production routes
- Migration scripts and SQL files scattered across 4+ directories
- `database.md` is a 75KB schema dump
- Sprint docs, setup guides, and troubleshooting pages in the repo root

### What Actually Works (Domain Value)

Despite the architectural mess, the **business logic is real and complete**:

1. **Property management** — multi-unit properties with individual bank accounts per unit, utility rate configuration, image galleries, amenity tracking
2. **Tenant (rentee) lifecycle** — registration, invitation flow, profile management, property association
3. **Agreement workflow** — template-based document generation, rich text editing, Evia Sign integration for digital signatures, webhook-driven status tracking through pending → partially_signed → signed
4. **Invoicing** — component-based billing (rent + electricity + water + past dues + taxes), batch generation, utility billing calculations, payment proof upload
5. **Maintenance** — request submission (with photo upload), assignment to staff, comment threads, status progression (open → assigned → in_progress → completed)
6. **Utility billing** — meter reading submission by rentees, staff review/approval, rate-based calculation, invoice integration
7. **RBAC** — granular permissions system (16 permission types across 7 roles)
8. **Multi-tenancy** — tenant isolation, membership management, per-tenant settings

---

## 2. Proposed Architecture: SvelteKit 5 + PostgreSQL

### Why This Stack

- **SvelteKit 5** — Duval's primary framework, runes-based reactivity, server-side rendering, form actions eliminate the need for a separate API server
- **PostgreSQL** — the database the original app was designed for (before the MSSQL migration), runs on NucBox, native JSONB, proper RLS if needed later
- **Drizzle ORM** — type-safe, SQL-first, perfect for JSDoc projects, generates migrations
- **Self-hosted** — Cloudflare tunnel from NucBox, consistent with existing infrastructure

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│                  SvelteKit 5                 │
│                                              │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐ │
│  │  Pages/   │  │  Server   │  │  Server   │ │
│  │  Layouts  │  │  Load Fns │  │  Actions  │ │
│  │  (Svelte) │  │  (+page   │  │  (form    │ │
│  │           │  │   .server) │  │  actions) │ │
│  └──────────┘  └─────┬─────┘  └─────┬─────┘ │
│                      │               │       │
│               ┌──────┴───────────────┘       │
│               │                              │
│  ┌────────────▼────────────┐                 │
│  │     Service Layer       │                 │
│  │  (lib/server/services/) │                 │
│  │                         │                 │
│  │  • property.service     │                 │
│  │  • agreement.service    │                 │
│  │  • invoice.service      │                 │
│  │  • maintenance.service  │                 │
│  │  • auth.service         │                 │
│  │  • storage.service      │                 │
│  └────────────┬────────────┘                 │
│               │                              │
│  ┌────────────▼────────────┐                 │
│  │     Drizzle ORM         │                 │
│  │  (lib/server/db/)       │                 │
│  │                         │                 │
│  │  • schema.js            │                 │
│  │  • relations.js         │                 │
│  │  • migrations/          │                 │
│  └────────────┬────────────┘                 │
│               │                              │
└───────────────┼──────────────────────────────┘
                │
        ┌───────▼───────┐
        │  PostgreSQL    │
        │  (NucBox)      │
        └───────────────┘
```

### Database Schema (PostgreSQL / Drizzle)

Clean relational design, dropping the MSSQL artifacts and Supabase ghost. All IDs as `uuid`, all timestamps as `timestamptz`, consistent snake_case.

```
tenants
├── id (uuid, pk)
├── name, slug (unique), status, plan
├── created_at, updated_at
│
├── tenant_settings (1:1)
│   ├── branding (jsonb), email_config (jsonb)
│   ├── signature_config (jsonb), feature_flags (jsonb)
│   └── storage_config (jsonb)
│
└── tenant_memberships (1:many)
    ├── user_id → users.id
    ├── role, status, is_default
    └── created_at, updated_at

users
├── id (uuid, pk)
├── email (unique), name, password_hash
├── role (enum: admin, manager, staff, maintenance_staff, finance_staff, supervisor, rentee)
├── user_type (enum: staff, rentee)
├── contact_details (jsonb), national_id, permanent_address
├── status, active, last_login
├── tenant_id → tenants.id
└── created_at, updated_at

properties
├── id (uuid, pk)
├── tenant_id → tenants.id
├── name, address, description
├── property_type, status
├── square_feet, year_built, amenities (text[])
├── rental_values (jsonb), terms (jsonb)
├── bank_name, bank_branch, bank_account_number
├── electricity_rate, water_rate
├── images (text[])
├── available_from
└── created_at, updated_at

property_units
├── id (uuid, pk)
├── property_id → properties.id
├── unit_number, floor, bedrooms, bathrooms
├── square_feet, description, status
├── rental_values (jsonb)
├── bank_name, bank_branch, bank_account_number
└── created_at, updated_at

agreement_templates
├── id (uuid, pk)
├── tenant_id → tenants.id
├── name, language, content (text — rich HTML)
├── version
└── created_at, updated_at

agreements
├── id (uuid, pk)
├── tenant_id → tenants.id
├── template_id → agreement_templates.id
├── rentee_id → users.id
├── property_id → properties.id
├── unit_id → property_units.id (nullable)
├── status (enum: draft, review, pending_signature, partially_signed, signed, cancelled)
├── start_date, end_date, signed_date
├── terms (jsonb), notes
├── document_url, pdf_url, signed_document_url
│
│   -- Evia Sign fields (keep for now, abstract later)
├── evia_sign_reference (uuid)
├── signature_request_id, signature_status
├── signatories_status (jsonb)
├── signature_sent_at, signature_completed_at, signature_pdf_url
└── created_at, updated_at

invoices
├── id (uuid, pk)
├── tenant_id → tenants.id
├── rentee_id → users.id
├── property_id → properties.id
├── billing_period (varchar)
├── components (jsonb — {rent, electricity, water, past_dues, taxes})
├── total_amount (numeric, generated/computed)
├── status (enum: draft, pending, sent, paid, overdue, cancelled)
├── due_date
├── payment_proof_url, payment_date
├── notes
└── created_at, updated_at

payments
├── id (uuid, pk)
├── invoice_id → invoices.id
├── amount (numeric)
├── payment_method, transaction_reference
├── payment_date, status, notes
└── created_at, updated_at

maintenance_requests
├── id (uuid, pk)
├── tenant_id → tenants.id
├── property_id → properties.id
├── rentee_id → users.id
├── assigned_to → users.id (nullable)
├── title, description
├── priority (enum: low, medium, high, urgent)
├── status (enum: open, assigned, in_progress, completed, cancelled)
├── request_type
├── assigned_at, started_at, completed_at
├── cancelled_at, cancellation_reason
├── notes
└── created_at, updated_at

maintenance_images
├── id (uuid, pk)
├── request_id → maintenance_requests.id
├── image_url, image_type, description
├── uploaded_by → users.id
└── uploaded_at

maintenance_comments
├── id (uuid, pk)
├── request_id → maintenance_requests.id
├── user_id → users.id
├── comment (text)
└── created_at, updated_at

utility_configs
├── id (uuid, pk)
├── property_id → properties.id
├── meter_type (enum: electricity, water)
├── rate_per_unit (numeric)
└── created_at, updated_at

utility_readings
├── id (uuid, pk)
├── tenant_id → tenants.id
├── property_id → properties.id
├── unit_id → property_units.id (nullable)
├── rentee_id → users.id
├── meter_type, previous_reading, current_reading
├── reading_date, photo_url
├── status (enum: submitted, approved, rejected, invoiced)
├── reviewed_by → users.id (nullable)
├── invoice_id → invoices.id (nullable)
└── created_at, updated_at

cameras
├── id (uuid, pk)
├── property_id → properties.id
├── location_description, camera_type
├── installation_details, data_package_info (jsonb)
├── status
└── created_at, updated_at

notifications
├── id (uuid, pk)
├── user_id → users.id
├── message, is_read
└── created_at, updated_at

letter_templates
├── id (uuid, pk)
├── tenant_id → tenants.id
├── type, subject, content, language, version
└── created_at, updated_at
```

### Route Structure (SvelteKit)

```
src/routes/
├── +layout.svelte              (root layout, auth check)
├── +layout.server.js           (session validation)
├── +page.svelte                (redirect → /login)
│
├── login/
│   ├── +page.svelte
│   └── +page.server.js         (form action: login)
├── reset-password/
├── setup-account/
│
├── (app)/                      (group: authenticated users)
│   ├── +layout.svelte          (sidebar nav, tenant context)
│   ├── +layout.server.js       (auth guard, load tenant)
│   │
│   ├── dashboard/
│   │   └── +page.svelte        (role-aware dashboard)
│   │
│   ├── properties/
│   │   ├── +page.svelte        (list)
│   │   ├── +page.server.js     (load properties)
│   │   ├── new/
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.js (form action: create)
│   │   └── [id]/
│   │       ├── +page.svelte    (detail view)
│   │       ├── +page.server.js
│   │       └── edit/
│   │
│   ├── rentees/                 (same CRUD pattern)
│   ├── agreements/
│   │   ├── templates/
│   │   └── [id]/
│   ├── invoices/
│   │   ├── batch/
│   │   └── [id]/
│   ├── maintenance/
│   │   └── [id]/
│   ├── utilities/
│   │   ├── readings/
│   │   └── review/
│   ├── cameras/
│   ├── team/
│   └── settings/
│
├── (portal)/                    (group: rentee portal)
│   ├── +layout.svelte          (portal layout, rentee nav)
│   ├── +layout.server.js       (rentee auth guard)
│   ├── portal/
│   │   ├── +page.svelte        (rentee dashboard)
│   │   ├── invoices/
│   │   ├── agreements/
│   │   ├── maintenance/
│   │   │   └── [id]/
│   │   ├── utilities/
│   │   │   ├── submit/
│   │   │   └── history/
│   │   └── profile/
│
├── api/                         (API routes for webhooks, email)
│   ├── email/+server.js
│   ├── evia/
│   │   ├── callback/+server.js
│   │   └── token/+server.js
│   └── webhooks/
│       └── evia/+server.js
│
└── admin/                       (super admin)
    ├── +layout.server.js        (admin-only guard)
    ├── tenants/
    └── tools/
```

### Key Architectural Decisions

**1. Server-first data loading**
No client-side Supabase shim. All data flows through `+page.server.js` load functions and form actions. The service layer lives in `$lib/server/` and is never shipped to the client.

**2. Drizzle schema as single source of truth**
The `schema.js` file defines all tables, relations, and enums. Migrations are generated from schema changes (`drizzle-kit generate`). No hand-written SQL migrations.

**3. Auth via SvelteKit hooks**
Use `hooks.server.js` to validate sessions on every request. Sessions stored in httpOnly cookies (or use Lucia Auth / custom JWT). No localStorage session persistence, no auth shim.

**4. File storage stays local (for now)**
Upload to a `storage/` directory on NucBox, served via static files or a simple API route. Can migrate to R2/S3 later. No Supabase storage abstraction.

**5. Evia Sign as a service module**
Keep the OAuth2 token exchange and webhook handler, but isolate them in `$lib/server/services/evia.js`. The Express proxy pattern was actually decent for this — SvelteKit API routes replace it cleanly.

**6. Permissions as a utility, not a component**
The existing RBAC model (7 roles × 16 permissions) is solid. Port the permission matrix to `$lib/permissions.js`, use it in `+page.server.js` guards and in layouts for conditional UI.

**7. Drop the multi-framework UI**
Replace MUI + Bootstrap + three icon libraries with Tailwind CSS only + a small component library (either Skeleton UI or hand-rolled). TipTap stays for the agreement template editor.

### Migration Strategy (for Claude Code)

**Phase 1: Schema & Data**
- Define Drizzle schema matching the PostgreSQL design above
- Write a one-time migration script that reads MSSQL data and inserts into Postgres
- Map old column names (camelCase/lowercase mess) to clean snake_case
- Parse JSONB fields that may have been stored as NVARCHAR(MAX) in MSSQL

**Phase 2: Core CRUD**
- Properties (with units)
- Users (with role system)
- Auth flow (login, reset password, session management)
- Build the layout shell (sidebar, tenant context)

**Phase 3: Business Logic**
- Agreements (templates + document generation + Evia Sign)
- Invoices (component-based billing, batch generation, utility calculation)
- Maintenance (requests + images + comments)
- Utility readings (submit → review → approve → invoice)

**Phase 4: Portal & Polish**
- Rentee portal (read-only views of their invoices, agreements, maintenance)
- Notifications
- Camera monitoring
- Admin tools & tenant management

### What Gets Dropped

- The entire `platformClientCore.js` Supabase shim (600+ lines)
- The `mssqlApiClient.js` dual-path branching
- The Express server (replaced by SvelteKit server routes)
- MUI, Bootstrap, React Bootstrap, FontAwesome, Heroicons, React Icons
- All diagnostic/debug/test pages
- The CORS proxy
- The `platformClient` query builder
- Docker/Azure deployment config (replaced by NucBox + Cloudflare tunnel)

### What Gets Kept (ported)

- The RBAC permission matrix (direct port)
- Evia Sign integration logic (token exchange, webhook handling)
- SendGrid email service (move to server-only)
- Invoice component calculation logic
- Utility billing rate calculations
- Agreement template rendering
- The TipTap rich text editor (has a Svelte version)
- The core database schema design (cleaned up)
