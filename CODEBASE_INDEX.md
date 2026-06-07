# Codebase index

Quick map of **where things live** in this Nx monorepo. Use this when jumping in for edits, reviews, or onboarding. For setup, prerequisites, and high-level architecture diagrams, see [README.md](./README.md).

---

## How requests flow

1. **Clients** call the **API Gateway** (`apps/api-gateway`) over **GraphQL** (and a few Express routes, e.g. uploads).
2. **Resolvers** in `apps/api-gateway/src/schema/resolvers.ts` call **REST** microservices through **`backendClient`** (`apps/api-gateway/src/services/backendClient.ts`): one shared Axios instance per downstream service, with **keep-alive** agents.
3. The gateway reads `Authorization: Bearer …` and `X-Organization-Id` from the incoming request, stores them in **AsyncLocalStorage** (`apps/api-gateway/src/lib/requestAuthContext.ts`), and the Axios **interceptor** forwards them to each microservice.
4. Each **Express** microservice typically protects routes with **`bearerAuthMiddleware`** from **`@vistone-server/shared-internal-auth`**, which validates the JWT by calling **auth-service** `POST /auth/me`.
5. **AI Engine** is **Fastify**; the gateway talks to it via `aiEngineClient` using the same URL/env pattern as other services.

---

## Service catalog

Nx project names match folder names under `apps/` (e.g. `npx nx run auth-service:serve`).

| Service | Folder | Default port | Gateway env: base URL for Axios |
|--------|--------|--------------|-----------------------------------|
| API Gateway | `apps/api-gateway/` | `4000` (`PORT` / `HOST`) | — |
| Auth | `apps/auth-service/` | `3001` | `AUTH_SERVICE_URL` |
| Workforce | `apps/workforce-management/` | `3002` | `WORKFORCE_SERVICE_URL` |
| Project management | `apps/project-management/` | `3003` | `PROJECT_SERVICE_URL` |
| Client management | `apps/client-management/` | `3004` | `CLIENT_SERVICE_URL` |
| Knowledge hub | `apps/knowledge-hub/` | `3005` | `KNOWLEDGE_SERVICE_URL` |
| Communication | `apps/communication/` | `3006` | `COMMUNICATION_SERVICE_URL` |
| Monitoring & reporting | `apps/monitoring-reporting/` | `3007` | `MONITORING_SERVICE_URL` |
| Notification | `apps/notification/` | `3008` | `NOTIFICATION_SERVICE_URL` |
| AI engine | `apps/ai-engine/` | `3009` | `AI_ENGINE_URL` |

Framework: **Express 5** for all services above except **AI Engine** (**Fastify 5**). Each service has its own `README.md`, `package.json`, `jest.config.ts`, and usually `eslint.config.mjs`.

---

## API Gateway (`apps/api-gateway/`)

| Area | Path | What it does |
|------|------|----------------|
| Server entry | `src/main.ts` | Express app, CORS, compression, Apollo Server, mounts GraphQL middleware and HTTP routes. |
| GraphQL schema (SDL) | `src/schema/typeDefs.ts` | Type definitions consumed by Apollo. |
| GraphQL resolvers | `src/schema/resolvers.ts` | Large file: delegates to `*Client` helpers from `backendClient`, uses auth helpers and loaders. |
| Downstream HTTP | `src/services/backendClient.ts` | `authClient`, `projectClient`, etc.; env-based base URLs; error normalization (`ServiceError`). |
| Auth for GraphQL | `src/lib/auth.ts` | `requireAuth`, `requireOrganization`, permissions, organizer checks — used by resolvers. |
| Per-request gateway context | `src/lib/requestAuthContext.ts` | AsyncLocalStorage for bearer token + org id (wired in `main.ts` before resolvers run). |
| DataLoader batching | `src/lib/graphqlLoaders.ts` | Reduces N+1 calls when resolvers need related entities. |
| GraphQL errors | `src/lib/errors.ts` | `formatGraphQLError` for Apollo; aligns with downstream error shapes. |
| Turnstile | `src/lib/turnstile.ts` | Cloudflare Turnstile verification (used where CAPTCHA is required). |
| Uploads | `src/routes/upload.ts` | Non-GraphQL HTTP route mounted from `main.ts`. |
| Validation helpers | `src/lib/validate.ts` | Shared validation utilities. |

When you add a new **field or mutation** that needs data from a microservice, you usually touch **`typeDefs.ts`**, **`resolvers.ts`**, and sometimes **`backendClient.ts`** (if a new client or path is needed).

---

## Express microservices (`apps/*` except `ai-engine`)

### Bootstrapping

| File | Role |
|------|------|
| `src/main.ts` | Starts HTTP server (port from env; see each service’s README or `main.ts`). |
| `src/app.ts` | Express app: `cors`, `express.json()`, `GET /`, `GET /health`, `app.use('/…', …Routes)` for each module. |

Routes are **mounted with a prefix** in `app.ts` (example from auth: `/auth`, `/users`, `/organizations`, …).

### Feature module convention (`src/modules/<domain>/`)

Typical files (not every module has every file):

| Pattern | Purpose |
|---------|---------|
| `*.routes.ts` | Express `Router`: paths and HTTP verbs. |
| `*.controller.ts` | Request handlers; call Prisma / services; return JSON. |
| `*.schema.ts` | **Zod** schemas for body/query validation. |
| `*.controller.spec.ts` | Jest unit tests for the controller. |

**Discover domains quickly:** list `src/modules/` for that app (e.g. project management includes `projects`, `tasks`, `milestones`, `risk-register`, `task-dependencies`, …).

### Shared service code (`src/lib/`)

Common pieces:

| File / area | Role |
|-------------|------|
| `prisma.ts` | Prisma client singleton / DB connection for this service. |
| `validate.ts` | Request validation helpers. |
| `permission-middleware.ts` (where present) | Service-specific authorization. |

### Internal auth (JWT → auth-service)

Library: **`libs/shared-internal-auth`**. Middleware validates Bearer tokens by calling **`POST {AUTH_SERVICE_URL}/auth/me`**. Services pass `authServiceUrl` from env and often use `defaultInternalAuthSkip` so `/`, `/health`, and `OPTIONS` stay public. **`SKIP_INTERNAL_SERVICE_AUTH=true`** disables verification (local scripts / tests).

### Health checks

Most services expose **`GET /health`** for load balancers and E2E setup.

---

## AI Engine (`apps/ai-engine/`)

| Area | Path |
|------|------|
| Entry | `src/main.ts`, `src/app/app.ts` |
| HTTP routes | `src/app/routes/` (`chat.ts`, `sync.ts`, `root.ts`, …) |
| Domain logic | `src/app/services/` (`chat.service.ts`, `rag.service.ts`, `sync.service.ts`, `rbac.service.ts`, `connectors.ts`, …) |
| Agent / tools | `src/app/agent/` (`runner.ts`, `tools.ts`) |
| Fastify plugins | `src/app/plugins/` (e.g. `auth.ts`) |
| Config / DB | `src/app/config.ts`, `src/app/db.ts` |
| Types | `src/app/types.ts` |
| Validation | `src/lib/validate.ts` |

Prisma schema: `prisma/schema.prisma` (included in workspace Prisma sync — see below).

---

## Data layer (Prisma & PostgreSQL)

### Services with a Prisma schema

`scripts/prisma-sync.ts` maintains this list (generate / push / validate across the repo):

- `auth-service`
- `workforce-management`
- `project-management`
- `client-management`
- `knowledge-hub`
- `communication`
- `monitoring-reporting`
- `notification`
- `ai-engine`

Each uses **`apps/<service>/prisma/schema.prisma`**. PostgreSQL **schemas** (namespaces) per domain are created via `scripts/init-schemas.sql` and documented in [README.md](./README.md).

### Repo-level Prisma commands

From root `package.json`:

- `npm run prisma:generate` — generate all clients  
- `npm run db:sync` — generate + push (dev workflow)  
- `npm run db:push` — push only  
- `npm run prisma:validate` — validate all schemas  

`prisma-sync.ts` supports **`--service=<nxProjectFolder>`** and **`--prod`** (see script header comments).

### Other databases

- **MongoDB** — used for chat-related data in Communication; see `MONGODB_URI` in [.env.example](./.env.example).  
- **Redis** — Socket.IO adapter / pub-sub; see `REDIS_URL` in [.env.example](./.env.example).

---

## Shared libraries (`libs/`)

| Package name | Path | Role |
|--------------|------|------|
| `@vistone-server/shared-internal-auth` | `libs/shared-internal-auth/` | `bearerAuthMiddleware`, `defaultInternalAuthSkip`, `RequestWithInternalUser` — shared Express middleware for service-to-service user context. |

---

## Root scripts (`scripts/`)

| File | Role |
|------|------|
| `prisma-sync.ts` | Cross-service Prisma generate / push / validate (see [Data layer](#data-layer-prisma--postgresql)). |
| `init-schemas.sql` | Creates PostgreSQL schemas expected by Prisma `schema.prisma` files. |
| `seed.ts` | Application seed data (`npm run seed`). |
| `push-schemas.ps1` | Windows-oriented helper for schema push. |

---

## Environment variables

- **Workspace template:** [.env.example](./.env.example) — `DATABASE_URL`, Google OAuth, Turnstile, **per-service ports and URLs** for the gateway, Gmail (notifications), **MongoDB**, **Redis**, Cloudinary, Cloudflare R2, etc.
- **Per-app examples:** `apps/api-gateway/.env.example`, `apps/notification/.env.example` for gateway- or service-specific overrides.

**Gateway → microservice URLs:** defaults in `backendClient.ts` are `http://localhost:<port>`; in deployment, set the `*_SERVICE_URL` and `AI_ENGINE_URL` variables to real bases (no trailing slash issues are normalized in shared-auth; keep bases consistent).

---

## Docker

Each production service has a **`Dockerfile`** at `apps/<service>/Dockerfile` (gateway + all microservices including `ai-engine`). Use these when packaging for deploy; Nx may expose **`docker:build`** / **`docker:run`** targets where configured in the workspace.

---

## Testing

| Layer | Where |
|-------|--------|
| Jest workspace root | `jest.config.ts` — loads all projects via `getJestProjectsAsync()`. |
| Per app / e2e | `apps/<name>/jest.config.ts` or `apps/<name>-e2e/jest.config.ts` |
| Unit / integration | `*.spec.ts` next to source; some apps have `*.integration.spec.ts` at `src/` root. |
| E2E | `apps/<service>-e2e/src/<service>/*.spec.ts` with `src/support/` (global setup/teardown, test-setup). |

Root scripts: `npm test`, `npm run test:ci`, `npm run test:coverage` (see [package.json](./package.json)).

---

## Linting & TypeScript

| Item | Location |
|------|----------|
| Root ESLint | `eslint.config.mjs` |
| Per project | `apps/<name>/eslint.config.mjs` (and `*-e2e` variants) |
| Base TS options | `tsconfig.base.json` |
| Project TS | `apps/<name>/tsconfig.json`, `tsconfig.spec.json`, etc. |

---

## E2E projects

| Pattern | Example |
|---------|---------|
| Folder | `apps/<service>-e2e/` |
| Specs | `src/<service>/<service>.spec.ts` |
| Shared | `src/support/global-setup.ts`, `global-teardown.ts`, `test-setup.ts` |

Nx Jest plugin excludes some e2e globs in `nx.json`; if a new e2e app is added, align with that config.

---

## Odd / legacy paths

| Path | Note |
|------|------|
| `apps/communication-service/` | Only a stub (e.g. `src/lib/validate.ts`). The real Communication service is **`apps/communication/`**. |

---

## Finding code by task (expanded)

| I want to… | Start here |
|------------|------------|
| Add or change **GraphQL** types or operations | `apps/api-gateway/src/schema/typeDefs.ts` + `resolvers.ts` |
| Call a **new downstream REST path** from the gateway | `backendClient.ts` (client method) + `resolvers.ts` |
| Add a **REST** route on a microservice | `apps/<svc>/src/modules/<domain>/` + register router in `src/app.ts` |
| Change **request validation** | Module `*.schema.ts` (Zod) and controller usage |
| Change **DB models or SQL** | `apps/<svc>/prisma/schema.prisma`, then migrate/generate via root Prisma scripts |
| Change **who can call** a microservice route | `bearerAuthMiddleware` usage + module middleware / `permission-middleware.ts` |
| Change **GraphQL auth rules** (org, role, permission) | `apps/api-gateway/src/lib/auth.ts` + affected resolvers |
| Batch / dedupe **gateway reads** | `apps/api-gateway/src/lib/graphqlLoaders.ts` |
| **Upload** or gateway-only HTTP | `apps/api-gateway/src/routes/upload.ts`, `main.ts` mounts |
| **CAPTCHA** / Turnstile | `apps/api-gateway/src/lib/turnstile.ts` + resolvers that call it |
| **AI / RAG / chat / sync** | `apps/ai-engine/src/app/` |
| **Cross-service JWT validation** | `libs/shared-internal-auth/` |
| **CI** | `.github/workflows/integrate.yml` |
| **Deploy** | `.github/workflows/deploy.yml` |

---

## Nx commands (reference)

Prefer Nx from the repo root:

| Command | Use |
|---------|-----|
| `npx nx run <project>:serve` | Dev server (often `--configuration=development`) |
| `npx nx run <project>:test` | Tests for one project |
| `npx nx run <project>:lint` | ESLint (when configured) |
| `npx nx run <project>:typecheck` | Typecheck (from `@nx/js` plugin where applicable) |
| `npx nx run-many --target=test --all` | All tests (see npm scripts for parallelism / CI flags) |
| `npm run dev` | `db:sync` + serve many apps in parallel (see [package.json](./package.json)) |

`<project>` is the folder name: `api-gateway`, `auth-service`, `shared-internal-auth`, etc.
