# Multi-Tenant Sprint Documentation

This directory contains the numbered sprint documents for the multi-tenant migration program.

## Master Document

For the sprint implementation stream, this file is the master index document.

Use it as the entry point for:

- sprint navigation
- progress tracking conventions
- locating the current sprint document

Document roles:

- [README.md](README.md): master sprint index
- [progress-tracker.md](progress-tracker.md): live execution status
- `00` to `08` sprint files: detailed sprint plans and scope
- [../multi-tenant-sprint-plan.md](../multi-tenant-sprint-plan.md): program overview

## Progress Tracking

Use [progress-tracker.md](progress-tracker.md) as the single place to update delivery status.

Suggested rule:

- update [progress-tracker.md](progress-tracker.md) after each completed implementation step
- update the current sprint file when scope, risks, or acceptance notes change
- treat the numbered sprint files as the plan, and the tracker as the live execution status

## Sprint Index

- [Sprint 00 - Discovery and Design](00-discovery-and-design.md)
- [Sprint 01 - Schema Foundation and Backfill](01-schema-foundation-and-backfill.md)
- [Sprint 02 - Backend Tenant Context](02-backend-tenant-context.md)
- [Sprint 03 - Data Access Isolation](03-data-access-isolation.md)
- [Sprint 04 - Platform API Hardening](04-platform-api-hardening.md)
- [Sprint 05 - Frontend Tenant Context](05-frontend-tenant-context.md)
- [Sprint 06 - Tenant-Scoped Storage](06-tenant-scoped-storage.md)
- [Sprint 07 - Tenant Settings and Integrations](07-tenant-settings-and-integrations.md)
- [Sprint 08 - Hardening, QA, and Release](08-hardening-qa-release.md)
- [Sprint 09 - Tenant Admin UI and Federated Auth](09-tenant-admin-and-federated-auth.md)

## Usage

Use these files as the source of truth for sprint-by-sprint planning and execution.
