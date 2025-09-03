# Code Review Report — lendesk-assignment

This review is organized by layers and key files. For each, I highlight strengths, improvement areas, and anti-patterns with respect to SOLID principles and Node.js/Express best practices for production services.

## Architecture & Composition Root

Files: `src/index.ts`, `src/server.ts`, `src/api/**`

- Strengths:
  - Clear composition root in `src/index.ts` wiring concrete implementations (Redis client → repository → service → controller → app). This exhibits Dependency Inversion (DIP) and keeps frameworks/infrastructure at the edges.
  - Separation of concerns is strong across controller/service/repository layers (SRP). Interfaces (`IAuthService`, `IAuthRepository`, `IPasswordStrategy`) enable Open/Closed and Liskov Substitution.
  - Graceful shutdown logic handles HTTP server and Redis cleanup, with unhandled rejection/exception guards.
  - Express app factory `createApp` takes dependencies explicitly (no globals), improving testability and isolation.

- Improvements:
  - Add a JSON 404 handler to ensure consistent JSON problem responses for unknown routes rather than the default HTML (see Middleware section).
  - Consider extracting bootstrapping signals/shutdown into a small utility to trim `index.ts` and keep it focused (minor).
  - Prefer a stable LTS base at runtime (Node 20/22) in Docker rather than latest/current (see Docker section).

- Anti-patterns:
  - None structural. The layering and dependency graph look clean and deliberate.

## Config & Environment

File: `src/config/index.ts`

- Strengths:
  - Centralized, typed config with sensible defaults. `as const` maintains immutability.
  - Log level automatically adjusts to environment; tests run with `silent` logging.

- Improvements:
  - Consider validating environment variables at startup using a schema (e.g., Zod) to fail fast on misconfigurations.
  - Avoid calling `dotenv.config()` inside library-like modules if you plan to publish pieces; for apps it’s fine. Alternatively, load env in the entrypoint and pass config down.

- Anti-patterns:
  - None.

## Logging

File: `src/common/logger/logger.ts`

- Strengths:
  - Thin wrapper around Pino with structured logging. Level controls via config.

- Improvements:
  - Add request-scoped logging (e.g., pino-http) with correlation/request IDs for better traceability across logs.
  - Ensure error logging uses the key `err` consistently so Pino serializers capture stack traces nicely (already followed in some places).

- Anti-patterns:
  - None.

## Error Handling

Files: `src/common/error/http-errors.ts`, `src/middleware/error.ts`, `src/middleware/jsonErrorHandler.ts`

- Strengths:
  - Domain-specific HttpError hierarchy with status codes encourages explicit failure modes.
  - Global error handler returns a sanitized 500 for unhandled errors; logs include error object.
  - JSON parse error handler (`jsonErrorHandler`) is present to catch malformed JSON early.

- Improvements:
  - Response shape inconsistency: `jsonErrorHandler` returns `{ error: 'Invalid JSON' }` while the global error handler returns `{ message: '...' }`. Unify error format project-wide (ideally Problem Details RFC 7807 or a consistent `{ message, code, details }`).
  - `errorHandler` imports `ErrorResponse` from `api/auth/auth.schema` creating a cross-layer dependency from a cross-cutting concern into a feature module. Move a generic error schema/type to a common module (e.g., `src/common/http/`) and depend on that instead.
  - Consider mapping known errors to codes (e.g., `ERR_VALIDATION`, `ERR_CONFLICT`) to aid clients and observability.

- Anti-patterns:
  - Cross-layer coupling: common middleware depending on an API feature schema.

## Middleware

Files: `src/middleware/validate.ts`, `src/middleware/async-handler.ts`, `src/middleware/health.ts`, `src/middleware/jsonErrorHandler.ts`, `src/middleware/error.ts`

- Strengths:
  - `validate(schema)` composes zod validation per-route and sanitizes logs for sensitive fields.
  - `asyncHandler` ensures thrown async errors route to the error handler.
  - Health endpoint exposes minimal, useful diagnostics (status, uptime, environment).

- Improvements:
  - Validation middleware logs request bodies at `info`; this is typically too chatty for production and risks PII even with redaction. Drop to `debug` and strictly ensure all sensitive fields are scrubbed. Consider using allowlists for fields to log rather than blacklists.
  - Enforce Content-Type for JSON endpoints (`application/json`) and limit payload size with `express.json({ limit: '1mb' })` to mitigate abuse.
  - Add a dedicated 404 JSON middleware after routes to normalize not-found responses and remove Express’s default HTML 404.

- Anti-patterns:
  - None functionally; just the logging level concerns.

## API Layer (Routing)

File: `src/api/index.ts`

- Strengths:
  - Routes are thin; validators and controller methods are clearly composed. Explicit dependency passing maintains testability.

- Improvements:
  - Consider grouping feature routers (e.g., `authRouter`) and mounting under `/api/v1/auth` in the API index to keep the index file minimal as features grow.

- Anti-patterns:
  - None.

## Controller

File: `src/api/auth/auth.controller.ts`

- Strengths:
  - Thin controller that delegates to service and returns DTOs. Uses bound arrow functions to preserve `this` when passing handlers.
  - Optional runtime response validation via zod schemas can guard accidental contract regressions.

- Improvements:
  - Response validation on every request adds runtime overhead; consider enabling only in non-production or moving to contract tests. If kept, log validation failures with context (without leaking PII) to aid debugging.

- Anti-patterns:
  - None significant; the controller respects SRP.

## Service

File: `src/api/auth/auth.service.ts`

- Strengths:
  - Encapsulates business rules (uniqueness check, hashing, credential verification). Depends on abstractions (`IAuthRepository`, `IPasswordStrategy`) per DIP.
  - Error semantics are explicit (`ConflictError`, `UnauthorizedError`).

- Improvements:
  - Registration uniqueness suffers from a TOCTOU race: `userExists()` then `createUser()` is not atomic. Two concurrent requests can pass the check and create duplicates.
    - Fix: enforce uniqueness atomically at the repository level using one of:
      - Redis `SET username:<u> <id> NX` before user creation, rolling back on failure.
      - A Lua script that checks-and-sets the username index and user hash in a single atomic operation.
      - `WATCH/MULTI/EXEC` transaction around the index key (more complex and still edge-prone).

- Anti-patterns:
  - None in design; just the atomicity gap noted above.

## Repository & Data Model

Files: `src/api/auth/auth.repository.ts`, `src/api/auth/auth.model.ts`

- Strengths:
  - Clean mapping between domain `User` (Date types) and `RedisUser` (stringified dates). Serialization/deserialization helpers are clear.
  - Uses `multi()` to batch hash set and index write; simple and readable storage model.

- Improvements:
  - Atomic uniqueness enforcement as noted above.
  - Consider adding basic data retention or TTL policies if appropriate (not for users, but for session-like data later). For now, this is fine.
  - Input type to `createUser` is `Omit<User, 'id' | 'createdAt' | 'updatedAt'>`; this is workable, but a dedicated `CreateUser` DTO type in the auth model can better communicate intent and avoid over-broad type allowances.

- Anti-patterns:
  - None significant; repository does not leak Redis-specific types across boundaries.

## Password Strategy

Files: `src/api/auth/strategies/*`

- Strengths:
  - Strategy interface (`IPasswordStrategy`) decouples hashing from business logic. Bcrypt implementation is minimal and correct.

- Improvements:
  - Consider parameterizing cost in tests to keep them fast (already done via config/utilities). As features grow, you may want a `Pepper` or additional policy checks (length/complexity are handled in request schema).

- Anti-patterns:
  - None.

## Middleware: JSON/Validation Schemas

File: `src/api/auth/auth.schema.ts`

- Strengths:
  - Zod schemas are expressive and precise; input constraints are reasonable and trimmed/normalized.

- Improvements:
  - Normalize usernames to a canonical form (e.g., lowercase) to prevent case-variant duplicates unless case sensitivity is a requirement. Apply normalization consistently in the controller/service before persistence.
  - Co-locate generic error response schema outside the auth module (see Error Handling).

- Anti-patterns:
  - None.

## Redis Client (Infra)

File: `src/infra/redis/client.ts`

- Strengths:
  - Encapsulates redis client with a small interface. Connect/quit/disconnect have logging and error handling.

- Improvements:
  - Consider adding simple health checks and retry/backoff on connect for robustness in containerized environments.
  - Wrap `multi()` pipelines with clear return types or helpers for common operations to minimize casting.

- Anti-patterns:
  - None.

## Testing

Files: `jest.config.js`, `src/**/__tests__/*`, `test/integration/**`

- Strengths:
  - Solid coverage across unit and integration layers. Testcontainers usage for Redis provides realistic integration tests.
  - App factory + DI make tests straightforward; integration helpers adapt raw Redis client to the repository’s interface.
  - Logging silenced in tests via config.

- Improvements:
  - Add contract tests (e.g., using the response schemas) if you remove runtime response validation in controllers.
  - Ensure consistent 404 JSON body expectations in tests once a JSON not-found handler is added.

- Anti-patterns:
  - None.

## Tooling & Linting

Files: `eslint.config.js`, `tsconfig.json`, `package.json`

- Strengths:
  - Modern ESLint flat config with TypeScript plugin and Prettier. Sensible tsconfig with strictness and source maps.
  - Scripts cover dev, tests, and formatting.

- Improvements:
  - Consider adding `npm run typecheck` alias to `tsc --noEmit` for CI to separate type checks from build.
  - Add `npm run test:ci` preset for non-watch tests with coverage thresholds if desired.

- Anti-patterns:
  - None.

## Docker & Compose

Files: `Dockerfile`, `docker-compose.yml`

- Strengths:
  - Multi-environment support with Redis service and healthy dev DX (nodemon + polling for hot reload in containers). Clear env wiring via `REDIS_URL`.

- Improvements:
  - Use an LTS base image for production (`node:20-alpine` or `node:22-alpine`) rather than `node:23-alpine` to ensure stability and security updates cadence.
  - Consider a multi-stage Docker build (builder + runtime) to keep the final image lean and avoid including dev dependencies.
  - In dev compose, prefer mounting only `src` and not the entire context to avoid node_modules churn; or rely on `docker compose watch`.

- Anti-patterns:
  - None major; the setup is fine for a small service.

---

# Priority Recommendations (Actionable)

1. Enforce username uniqueness atomically in Redis

- Impact: High (data integrity under load). Effort: Medium.
- Approach: Use `SET username:<u> <id> NX` followed by `HSET user:<id> ...` in the same Lua script; or at minimum, `SET ... NX` and roll back on hash failure.

2. Unify error response format across middlewares

- Impact: Medium (client experience, observability). Effort: Low.
- Approach: Define a common error response (e.g., `{ message, code, details? }`) in `src/common/http/` and use it in both `jsonErrorHandler` and `errorHandler`.

3. Add JSON 404 middleware

- Impact: Medium (consistency). Effort: Low.
- Approach: `app.use((req,res)=>res.status(404).json({ message: 'Not Found' }))` before `errorHandler`.

4. Reduce request logging verbosity in validation middleware

- Impact: Medium (security, performance). Effort: Low.
- Approach: Drop to `debug` and/or switch to allowlists; ensure exhaustive PII scrubbing.

5. Normalize usernames

- Impact: Medium (correctness). Effort: Low.
- Approach: Lowercase in controller/service before validation/persistence, and update schema/docs/tests accordingly.

6. Runtime response validation policy

- Impact: Low-Medium (performance vs. safety). Effort: Low.
- Approach: Gate response schema validation behind an env flag (on in dev/test, off in prod) or replace with contract tests.

7. Adopt LTS base image and optional multi-stage build

- Impact: Medium (security, size). Effort: Low-Medium.

---

# SOLID Assessment Summary

- SRP: Good separation (controller/service/repository/infra). Controllers are thin; services own business logic; repository owns persistence.
- OCP: Good via interfaces; easy to extend repository (e.g., switch Redis to another store) or add password strategies.
- LSP: Interfaces are small and substitutable; tests already swap implementations.
- ISP: Interfaces are focused (`IPasswordStrategy`, `IAuthRepository`, `IAuthService`).
- DIP: Upper layers depend on abstractions; composition root provides concrete implementations.

Overall, the codebase demonstrates solid fundamentals with thoughtful layering and testability. The main production-readiness gap is atomic uniqueness enforcement and consistent error responses. Addressing the priority items above will move this from “very good” to “production-robust.”
