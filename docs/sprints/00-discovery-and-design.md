# Sprint 00 - Discovery and Design

## Goal
Finalize the multi-tenant target design and implementation boundaries before delivery starts.

## Objectives
- confirm the tenancy model
- identify all tenant-owned entities
- define user, membership, and active-tenant behavior
- define rollout and rollback expectations
- define the Docker/container target for development and deployment

## Scope
- architecture baseline
- entity inventory
- security boundary review
- migration dependency map
- container runtime assumptions and deployment constraints

## Work Items
- catalogue all tables that need `tenant_id`
- define `tenants`, `tenant_memberships`, and `tenant_settings`
- define parent-child tenant ownership rules
- define active tenant selection flow
- identify generic query and RPC risks
- document storage migration expectations
- define container topology for app, SQL Server, and storage volumes
- define runtime environment variable contract for Docker
- confirm health check and readiness expectations for container deployment

## Deliverables
- approved target data model
- approved auth/session model
- approved tenant isolation rules
- migration risk register
- approved containerization constraints and target runtime model

## Acceptance Criteria
- architecture signoff completed
- tenant ownership rules documented
- unresolved blockers identified and assigned
- Docker/runtime assumptions documented and accepted

## Dependencies
- current data model review
- backend/API review
- storage and integration review

## Notes
This sprint should end with enough detail to begin schema work safely.
