# Multi-Tenant Migration Sprint Plan

## Overview

This file is the master overview for the numbered sprint documentation set.

## Sprint Documents

- [Sprint 00 - Discovery and Design](sprints/00-discovery-and-design.md)
- [Sprint 01 - Schema Foundation and Backfill](sprints/01-schema-foundation-and-backfill.md)
- [Sprint 02 - Backend Tenant Context](sprints/02-backend-tenant-context.md)
- [Sprint 03 - Data Access Isolation](sprints/03-data-access-isolation.md)
- [Sprint 04 - Platform API Hardening](sprints/04-platform-api-hardening.md)
- [Sprint 05 - Frontend Tenant Context](sprints/05-frontend-tenant-context.md)
- [Sprint 06 - Tenant-Scoped Storage](sprints/06-tenant-scoped-storage.md)
- [Sprint 07 - Tenant Settings and Integrations](sprints/07-tenant-settings-and-integrations.md)
- [Sprint 08 - Hardening, QA, and Release](sprints/08-hardening-qa-release.md)
- [Sprint 09 - Tenant Admin UI and Federated Auth](sprints/09-tenant-admin-and-federated-auth.md)

## Program Objective

Convert KH Rentals from a single-tenant application into a tenant-aware SaaS platform without breaking the current app, current routes, or current production workflows.

## Guiding Principles

- Keep the current app working during the migration.
- Introduce tenant isolation first, then tenant-specific UX.
- Use a shared SQL Server database with strict `tenant_id` scoping.
- Avoid large route rewrites in the first phases.
- Keep backward compatibility for storage paths and existing records.

## Non-Functional Delivery Requirements

- The application must be container-ready for Docker-based development and deployment.
- The app container and SQL Server must remain separate services.
- File storage must support mounted volumes for `/public/storage`.
- Environment-driven configuration must work cleanly in container runtime.
- The multi-tenant rollout should not assume bare-metal-only or VM-only hosting.

## Success Criteria

By the end of the program, the system should support:

- multiple business tenants in one application
- a single user belonging to one or more tenants
- tenant-scoped data access for all business entities
- tenant switching in the UI
- tenant-scoped storage and configuration
- tenant administration from the UI
- Google and Microsoft login options
- production-safe tenant isolation tests

## Suggested Timeline

Assuming 2-week sprints:

- Sprint 00: 1 week
- Sprint 01: 2 weeks
- Sprint 02: 2 weeks
- Sprint 03: 2 weeks
- Sprint 04: 2 weeks
- Sprint 05: 2 weeks
- Sprint 06: 2 weeks
- Sprint 07: 2 weeks
- Sprint 08: 2 weeks
- Sprint 09: 2 weeks

Estimated total: 17 to 19 weeks depending on test coverage, migration effort, integration complexity, and identity-provider setup.

## Containerization Workstream

Containerization should be treated as a cross-cutting delivery stream, not as a substitute for the tenancy design.

Recommended implementation approach:

- Sprint 00: define container target architecture and runtime constraints
- Sprint 01: validate schema and backfill scripts in Docker-friendly local environments
- Sprint 02 to 07: keep all new backend changes environment-driven and container-safe
- Sprint 08: finalize Docker packaging, mounted storage, health checks, and release validation
- Sprint 09: validate tenant-admin workflows and federated auth callback behavior in containerized and hosted environments

Recommended container model:

- `web` service for the application
- `mssql` as a separate service for local development or testing
- mounted volume for storage assets
- environment variables injected at runtime

## Definition of Done for the Program

The multi-tenant migration is complete when:

- every tenant-owned row has a valid `tenant_id`
- every protected API request resolves a valid active tenant
- every data access path is tenant-scoped
- the frontend supports multi-tenant membership and tenant switching
- storage is tenant-scoped for new assets
- tenant administrators can manage tenants and memberships without direct database edits
- supported federated login providers resolve into the correct tenant-aware user context
- legacy data and legacy files continue to work
- test coverage includes isolation and regression checks
- rollout and rollback procedures are documented and verified
