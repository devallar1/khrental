# Sprint 07 - Tenant Settings and Integrations

## Goal
Enable per-tenant configuration for branding, templates, and external integrations.

## Objectives
- activate `tenant_settings`
- support tenant-specific branding and defaults
- isolate integration settings where required

## Scope
- branding
- email sender config
- document template behavior
- integration configuration
- feature flags

## Work Items
- implement tenant settings read/write flows
- support tenant branding assets and display values
- tenant-scope templates and document defaults
- add tenant-level integration configuration for email and signing if required
- add per-tenant feature flags
- create admin management screens for tenant settings

## Deliverables
- tenant settings model in use
- tenant-aware branding and template behavior
- configurable feature flags and integration settings

## Acceptance Criteria
- tenant settings are stored and applied consistently
- branding and template behavior can differ per tenant
- integration configuration can be isolated where needed

## Dependencies
- Sprint 05 frontend tenant context
- Sprint 06 tenant-scoped storage

## Risks
- shared configuration assumptions in existing flows
- branding and email behavior inconsistencies across pages and documents
