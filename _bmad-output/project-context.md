---
project_name: 'salonflow'
user_name: 'Devender Sharma'
date: '2026-05-31'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'style_rules', 'workflow_rules', 'gotchas']
status: 'complete'
rule_count: 18
optimized_for_llm: true
existing_patterns_found: 8
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Frontend**:
  - Next.js: `16.2.6` (App Router)
  - React: `19.2.4`
  - Styling: TailwindCSS `^4` (using PostCSS `@tailwindcss/postcss`)
  - Authentication: Clerk Auth (`@clerk/nextjs` `^7.4.2`)
  - UI Icons: `lucide-react` `^1.17.0`
  - Data Visualizations: `recharts` `^3.8.1`
  - Class Name Merging: `clsx` and `tailwind-merge`

- **Backend**:
  - NestJS: `^11.0.1` (Injectable DI services, express controllers)
  - ORM: Prisma Client `^7.8.0` with PostgreSQL
  - Authentication: Clerk Node SDK (`@clerk/clerk-sdk-node` `^4.13.23`)
  - AI Capabilities: OpenAI SDK (`openai` `^6.39.1`)
  - Asynchronous Operations: RxJS `^7.8.1`
  - ID Generation: UUID `^14.0.0`
  - Core Runtime: Node.js (TypeScript `^5.7.3`)

- **Testing & Tooling**:
  - Testing Framework: Jest `^30.0.0`
  - E2E Testing: Supertest `^7.0.0`
  - TypeScript Compiler: `ts-jest` and `ts-loader`
  - Code Formatting & Linting: Prettier `^3.4.2` and ESLint `^9`

- **Critical Integration Constraints**:
  - **TailwindCSS v4**: CSS-only configuration inside `frontend/src/app/globals.css` using `@theme` and `@import`. Do NOT create `tailwind.config.js` (it will be ignored).
  - **Prisma Client Cache**: Cache Prisma Client globally in Next.js Server Components to prevent PostgreSQL connection exhaustion.
  - **Clerk Middleware**: Use fully async-compatible middleware route checks in `frontend/src/middleware.ts`.

---

## Critical Implementation Rules

### Framework-Specific Rules

- **Next.js & React 19 (Frontend)**:
  - **Component Isolation**: Strictly segregate Server Components (default) from Client Components. Add the `"use client"` directive only at the very top of files containing interactive states (`useState`, `useActionState`), effects (`useEffect`), or browser-only APIs.
  - **Route Groups & layouts**: Keep routing logical. The dashboard lives under `frontend/src/app/(dashboard)`. Make sure any route group has a unified, structured `layout.tsx` to handle authentication guards, navigation sidebar state, and responsive containers.
  - **Tailwind v4 Styling**: Custom theme configurations must reside inside `frontend/src/app/globals.css` using the `@theme` block. Agents are prohibited from using or creating legacy `tailwind.config.js` or `.postcssrc` files.

- **NestJS & Prisma ORM (Backend)**:
  - **Controller vs Service Boundaries**: Controllers under `backend/src/` must focus strictly on HTTP routing, schema validation, and parsing responses. All core business logic, database queries, and third-party API calls must reside inside `@Injectable()` services.
  - **Prisma Service Dependency**: Never instantiate a new `PrismaClient` locally. Always inject the global `PrismaService` via the class constructor.
  - **Transactional Safety**: For compound writes (e.g., creating a booking and creating an associated audit log entry), use `prisma.$transaction` to guarantee database consistency.

### Language-Specific Rules

- **TypeScript Strictness**:
  - Both `/frontend` and `/backend` must enforce strict typing.
  - Set `"strict": true` and `"skipLibCheck": true` in `tsconfig.json` to prevent React 19 / NestJS 11 declaration conflicts.
  - Absolutely forbid the use of `any`. If a type is unknown or dynamic, use `unknown` or define a strong interface/type alias.

- **Import & Export Conventions**:
  - Prefer named exports (`export const MyComponent = ...`) for React frontend components to improve tree-shaking and IDE import autocomplete.
  - Follow NestJS standard ES module imports on the backend. Always use explicit relative path imports (e.g. `../prisma/prisma.service`) rather than absolute paths unless alias paths are explicitly configured in `tsconfig.json` paths.

- **Error Handling Standards**:
  - **Backend (NestJS)**: Every public service method performing database, filesystem, or external network operations must wrap the execution inside a `try-catch` block. The catch block must instantiate and use the NestJS built-in `Logger` to output `this.logger.error("Description: " + error.message)` before throwing or returning a typed response.
  - **Frontend (Next.js)**: Use standard async-await handling. In Client Components, wrap API fetch calls in local state try-catch blocks to set user-friendly error messages. For unhandled errors, rely on standard Next.js `error.tsx` boundaries.

### Testing Rules

- **Test Placement & Organization**:
  - **Unit Tests**: Place `.spec.ts` files adjacent to the source code they test (e.g., `appointments.service.spec.ts` must sit in the same directory as `appointments.service.ts` under `backend/src/appointments/`).
  - **Integration & E2E Tests**: Put all end-to-end integration tests in the `/backend/test/` directory, using the `.e2e-spec.ts` naming convention. Execute them using `npm run test:e2e` via Supertest.

- **Mocking Strategy (Gotcha Prevention)**:
  - **Prisma Mocking**: Do NOT perform actual PostgreSQL database operations in unit tests. Always mock `PrismaService` using custom factory mock functions or standard jest mocks (`jest.mock(...)`) to guarantee speed and isolate database errors.
  - **Third-Party API Mocks**: Always mock external network calls like the `OpenAIService` (OpenAI SDK calls) and the `WhatsAppService` (WhatsApp webhooks/API requests) to avoid unneeded API billing and mock network lag.

- **Test Structure & Cleanliness**:
  - Use standard Jest structure: `describe()` blocks mapping to the class/function name, followed by `beforeEach()` to reset all module registers, and highly descriptive `it('should...')` test specs.
  - Never let local state persist between test cases. Reset mock calls using `jest.clearAllMocks()` or `jest.resetAllMocks()` inside a `afterEach()` block.

### Code Quality & Style Rules

- **ESLint & Prettier Strict Adherence**:
  - Keep styling consistent. Run Prettier formatting via `prettier --write "src/**/*.ts"` before committing.
  - Never allow compilation or lint warnings to persist. Pre-commit checks will automatically block commits containing ESLint errors.

- **Strict File & Directory Naming Conventions**:
  - **React Frontend**: Next.js app directory pages and routes must strictly use standard lowercase `kebab-case` for paths (e.g., `(dashboard)/campaigns/page.tsx`). Components must be named using `PascalCase` matching their file name (e.g., `Sidebar.tsx` maps to `export const Sidebar = ...`).
  - **NestJS Backend**: Filenames for modules, services, and controllers must be separated with periods and use kebab-case (e.g. `appointments.service.ts`, `appointments.controller.ts`). The classes inside must sit in PascalCase matching the file structure (e.g., `class AppointmentsService`, `class AppointmentsController`).

- **Code Nesting & Cleanliness boundaries**:
  - **Single Responsibility Principle (SRP)**: Keep each file limited to a single class, component, or interface. Functions must remain highly focused; if a function exceeds 50 lines, refactor it into smaller utility methods inside `frontend/src/lib/` or `backend/src/utils/`.
  - **No Complex Ternaries**: Avoid nested ternary operators (e.g. `x ? y ? a : b : c`). Always expand complex conditionals into clear, readable standard `if-else` statements.

### Development Workflow Rules

- **Git Branch Naming Conventions**:
  - All workspace changes must occur in isolated branch streams.
  - Use semantic branch naming prefixes:
    - `feature/` for new capabilities (e.g. `feature/whatsapp-webhook-handler`)
    - `bugfix/` for resolving existing glitches (e.g. `bugfix/clerk-auth-redirect`)
    - `hotfix/` for emergency production modifications

- **Structured Semantic Commits**:
  - Commits must use clean, lowercase prefixes to enforce a readable git history:
    - `feat:` for new capabilities
    - `fix:` for code bug fixes
    - `refactor:` for architectural restructuring without user-facing changes
    - `test:` for writing new unit or E2E tests
    - `docs:` for markdown and documentation adjustments
  - **Example**: `feat: implement appointment slot availability service`

- **Pre-PR Quality Gate Checklist**:
  - Before requesting review or opening a PR:
    1. Ensure typescript compilation passes without errors: `npm run build`
    2. Check that all ESLint warnings are fixed: `npm run lint`
    3. Run local unit test coverage and ensure 100% pass: `npm run test`

### Critical Don't-Miss Rules

- **Anti-Patterns & Security Gotchas**:
  - **No Hardcoded API Keys or Secrets**: Absolutely never place credentials (e.g. Clerk secrets, OpenAI keys, Stripe secret webhooks) in source code. On the NestJS backend, always ingest them via `@nestjs/config` `ConfigService`. On Next.js frontend, use environment variables (`process.env.NEXT_PUBLIC_...` strictly for public values).
  - **Sanitized Logging**: Avoid printing personal identifiable information (PII) like raw customer phone numbers, auth credentials, or Stripe payloads in application-wide `Logger` statements or public `AuditLog` JSON tables.

- **Temporal Edge Cases (Time Zone Drift)**:
  - **UTC Storage & Local Offsets**: All appointment times (`startTime`, `endTime`) in PostgreSQL must strictly be stored in UTC format. When displaying calendars or checking availability on the frontend dashboard, always shift the time slots based on the specific salon's local timezone offset to prevent "day-off-by-one" booking rendering errors.

- **Asynchronous WhatsApp Handling**:
  - **No Blocking API Calls**: Sending WhatsApp campaigns or booking confirmations must never block the main Express request cycle. Always offload these operations to background jobs using NestJS `@nestjs/schedule` or async queues to prevent UI timeouts during high-traffic booking periods.

---

## Executive Leadership Board & Feature Review Workflow

All BMad agents on this project operate as an Executive Leadership Board for SalonFlow. 

### Feature Review & Approval Checklist
Before any new feature is approved or implemented, the following validation roles must sign off:
1. **Business SME (Rajesh)**: Validates business value & industry workflows.
2. **COO (Vikram)**: Validates operational ROI & GTM roadmap priority.
3. **Backend Architect (Arjun)**: Validates API scalability, database design, & multi-tenant isolation.
4. **Frontend Architect (Priya)**: Validates UI usability & mobile-friendliness for non-technical salon owners.
5. **AI Architect (Karan)**: Validates AI feasibility, accuracy target, and latency/cost trade-offs.
6. **Security Architect (Marcus)**: Validates OWASP compliance, data isolation, and API security.
7. **SRE / DevOps Architect (Rohan)**: Validates production uptime, backup strategies, and deployment paths.
8. **QA Director (Neha)**: Validates test coverage requirements, E2E, and load testing.
9. **Growth Strategist (Aditya)**: Validates revenue monetization models and competitive positioning.

### Feature Request Template
For every new feature request, agents must generate a report covering:
1. **Executive Summary**: Overview of the feature.
2. **Business Impact**: How it solves salon owner pain points.
3. **Revenue Impact**: GTM pricing tier, expansion, and LTV metrics.
4. **Customer Impact**: Retention, reviews, and client satisfaction.
5. **Development Complexity**: Estimated engineering resources and tech debt checks.
6. **Infrastructure Impact**: Scalability overhead and host constraints.
7. **Security Impact**: Threat model, OAuth scope, and compliance.
8. **AI Cost Impact**: API billing, token constraints, and caching strategies.
9. **Competitive Advantage**: Moat comparison vs TapGro, Respark, InVoy, Fresha, Zenoti, Vagaro.
10. **Recommended Plan Placement**: BASIC / AI PRO / ENTERPRISE tier placement.

**Priority Assignment**:
* `P0 Critical` (Must have for pilot launch)
* `P1 High` (Revenue/retention drivers)
* `P2 Medium` (Efficiency gains)
* `P3 Future` (Roadmap optimization)

### Weekly Review Template
Weekly reports must evaluate and score project readiness:
- **Metrics**:
  * **Product Health Score** (Out of 100)
  * **MVP Completion %**
  * **Launch Readiness %**
  * **Revenue Readiness %**
  * **Security Readiness %**
  * **Scalability Readiness %**
- **Updates**:
  * **Feature Progress** (Completed vs pending list)
  * **Risk Register** (Mitigation pathways)
  * **Missing Features & Competitive Gaps** (Zenoti / Fresha comparisons)
  * **Recommended Next Sprint** (Checklist for upcoming iteration)

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns or dependencies emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update this file immediately when the technology stack changes.
- Review quarterly for outdated rules or deprecations.
- Remove rules that become obvious to agents over time.

Last Updated: 2026-05-31
