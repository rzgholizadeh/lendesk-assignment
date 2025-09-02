**Project Overview**

- This is a TypeScript Node.js backend service that exposes a small HTTP API for user authentication (register and login). It follows a clean, layered architecture with explicit dependency injection, uses Redis as a data store, validates inputs with Zod, and includes robust testing (unit and integration) with Jest and Testcontainers. The app is containerized with Docker and orchestrated via Docker Compose for local development.

**Technology Stack**

- Node.js + TypeScript: runtime and language
- Express 5: HTTP server and routing
- Redis: data store (users and indexes)
- Zod: request payload validation
- Helmet: basic security headers
- bcrypt: password hashing
- Jest, ts-jest, Supertest: unit and API testing
- Testcontainers: integration tests with ephemeral Redis
- Docker + Docker Compose: local dev environment

**Local Environment Setup**

- Run containers: `npm run dev:build` (build+start) or `npm run dev:start` (start)
- Run tests: all `npm test` | unit `npm run test:unit` | integration `npm run test:int`
- Clean up: stop `npm run dev:stop` | remove images `npm run dev:clean`

**Architecture**

- Brief: Clean, layered design with strict boundaries. Request flows top→down; dependencies point inward. Composition root in `src/index.ts` wires concrete implementations; upper layers depend on interfaces.
- SOLID in practice: SRP (one concern per layer), OCP/DIP (swap infra via `IAuthRepository`/`IAuthService`), LSP (alternate impls usable via interfaces), ISP (small focused interfaces).
- Composition root: `src/index.ts` → `RedisClientService` → `AuthRepository` → `AuthService` → `createApp({ authService })`.
- Cross-cutting: `middleware/` (JSON error handler, health, logger), `config/` (env), `server.ts` (Express setup).
