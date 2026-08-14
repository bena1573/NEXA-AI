# NEXA AI

Multi-tenant AI customer support and voice agent platform. Businesses connect their
own knowledge (profile, FAQs, documents, URLs), and NEXA AI answers customer
questions over website chat and voice — using **only** that authorised
information — while performing controlled actions such as booking appointments,
creating support tickets and escalating to a human.

> **Demo mode is the default.** With no external API keys the platform runs
> end-to-end against a deterministic local AI provider and a call simulator. It
> never claims a real phone call was placed, and no payment provider is connected.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design: stack
rationale, provider abstractions, RAG pipeline, tool-calling model, tenant
isolation, external-API vs demo-mode matrix, risks and delivery phases.

- **Next.js (App Router) + TypeScript + Tailwind** — server components for data,
  route handlers for the API, one deployable.
- **PostgreSQL + Prisma + pgvector** — relational data and embeddings in one
  database; no separate vector service to operate.
- **Provider abstractions** — `AIProvider` (demo / any OpenAI-compatible endpoint)
  and `VoiceProvider` (simulator / Twilio-shaped) so no vendor is hard-coded into
  the product.
- **Tenant isolation** — every business-owned row carries `businessId`, and access
  is authorised through a server-derived `BusinessContext`; client-supplied
  business ids are never trusted.
- **Grounded answers** — retrieval and allowlisted, Zod-validated tools are the
  only sources of business facts. Anything else returns the fallback: *"I don't
  have that information available right now. I can connect you with a member of
  our team."*

## Getting started

Requires Node 22+ and Docker (for Postgres with pgvector).

```bash
cp .env.example .env

docker run -d --name nexa-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nexa \
  -p 5432:5432 pgvector/pgvector:pg16

npm install
npm run db:migrate      # applies migrations, including CREATE EXTENSION vector
npm run dev
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run test:integration` | Integration tests (needs a migrated Postgres + pgvector database) |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in a deployed environment |
| `npm run db:seed` | Load demo data |

## Configuration

All configuration is environment-based and validated at startup by
[`lib/env.ts`](lib/env.ts); see [`.env.example`](.env.example) for the full list.
Only `DATABASE_URL` and `AUTH_SECRET` are required — everything else degrades to
demo behaviour rather than failing.
