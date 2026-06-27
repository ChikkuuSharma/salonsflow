# Deferred Work

## Deferred from: code review (2026-06-02) (1-1-service-layer-tenant-scope-enforcement.md)

- **Pre-existing ESLint Type Safety Violations**: There are 256 pre-existing ESLint errors/warnings in the backend codebase regarding unsafe assignments (`any`), unsafe member access, and unbound methods. These are pre-existing issues not caused by the current multi-tenancy service isolation changes.
