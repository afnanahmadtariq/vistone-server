# API Gateway

> **Port:** `4000` | **Framework:** Express + Apollo Server | **GraphQL Endpoint:** `/graphql`

---

## Overview

The API Gateway is the single entry point for all client-facing requests. It aggregates all microservices behind a unified **GraphQL API** using Apollo Server, proxying queries and mutations to the appropriate downstream REST services.

## Architecture

```
Client → GraphQL (:4000/graphql) → Resolvers → HTTP → Microservices (:3001–3009)
```

## Features

| Feature                         | Status |
| ------------------------------- | ------ |
| Apollo GraphQL Server           | ✅     |
| GraphQL Playground              | ✅     |
| CORS (configurable origins)     | ✅     |
| Bearer token extraction         | ✅     |
| Health check (`GET /health`)    | ✅     |
| Dual mount (`/` and `/graphql`) | ✅     |

## Configuration

| Env Variable  | Default     | Description                              |
| ------------- | ----------- | ---------------------------------------- |
| `HOST`        | `localhost` | Server host                              |
| `PORT`        | `4000`      | Server port                              |
| `CORS_ORIGIN` | `*`         | Allowed origins (comma-separated or `*`) |

## Endpoints

| Method | Path       | Description         |
| ------ | ---------- | ------------------- |
| `GET`  | `/health`  | Health check        |
| `POST` | `/graphql` | GraphQL endpoint    |
| `POST` | `/`        | GraphQL (alt mount) |

## Schema

The GraphQL schema is defined in:

- `src/schema/typeDefs.ts` — Type definitions
- `src/schema/resolvers.ts` — Resolver implementations

## Running

```bash
npx nx serve api-gateway
```
