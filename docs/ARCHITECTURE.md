# NEXA AI — Architecture (Phase 1)

> Status: proposal + implementation contract for this repository.
> Every decision below is implemented in code unless explicitly marked *deferred*.

## 1. Product in one paragraph

A multi-tenant SaaS where a business teaches NEXA AI about itself (profile, hours,
services, FAQs, documents) and NEXA AI then answers its customers over **chat** and
**voice**, performing controlled actions (booking, lead capture, tickets, escalation)
and never inventing business facts.

## 2. Non-negotiable constraints

| Constraint | How it is enforced |
| --- | --- |
| No hallucinated business facts | RAG context is the only factual source; the system prompt forbids invention; low-retrieval-confidence answers fall back to the escalation sentence. Facts the AI states come from retrieved chunks or tool results. |
| Runs with zero external API keys | `DEMO_MODE=true` (default when `AI_API_KEY` is unset) swaps in deterministic `DemoAIProvider` + `SimulatedVoiceProvider`, and the UI shows a persistent **Demo Mode** badge. |
| Tenant isolation | Every business-owned table has `businessId`; **all** reads/writes go through `lib/db/tenant.ts` helpers that require a resolved `BusinessContext`; no route handler queries Prisma with a client-supplied `businessId`. |
| Never claim real phone calls | Voice is a provider interface; the default provider is a simulator, clearly labelled, with documented integration points for Twilio/Vonage. |

## 3. Stack and rationale

- **Next.js 15 App Router + TypeScript** — one deployable, server components for data
  reads, route handlers for the API/webhooks.
- **Tailwind CSS + shadcn-style primitives (Radix)** — hand-vendored into
  `components/ui` so there is no CLI/registry dependency.
- **PostgreSQL + Prisma + pgvector** — relational integrity for the SaaS domain,
  vector search in the same database (no extra infra).
- **Custom session auth** (Argon2id-grade hashing via bcrypt, signed JWT session
  cookie with `jose`, sessions row in DB for revocation) — full control over
  role checks and tenant resolution, no third-party auth dependency.
- **Vitest** — unit + integration tests; DB-backed tests skip cleanly when no
  `DATABASE_URL` is reachable.

## 4. Provider abstractions

```ts
// lib/ai/provider.ts
interface AIProvider {
  generateResponse(input: GenerateInput): Promise<GenerateResult>;  // supports tool calls
  generateEmbedding(text: string): Promise<number[]>;
  classifyIntent(text: string): Promise<IntentResult>;
  summarizeConversation(messages: Message[]): Promise<ConversationSummary>;
}
// implementations: OpenAICompatibleProvider (any OpenAI-shaped endpoint) | DemoAIProvider
```

```ts
// lib/voice/provider.ts
interface VoiceProvider {
  createCall(...): Promise<CallHandle>;
  answerCall(...): Promise<VoiceTurnInstruction>;
  transferCall(...): Promise<void>;
  endCall(...): Promise<void>;
  getCallRecording(...): Promise<RecordingRef | null>;
}
// implementations: SimulatedVoiceProvider (default) | TwilioVoiceProvider (integration points documented, disabled without credentials)
```

Selection happens once in `lib/ai/index.ts` / `lib/voice/index.ts` based on env, so no
call site knows the vendor.

## 5. RAG pipeline

```
ingest:  upload/url/text ──► extract (pdf-parse | mammoth | html strip)
                          ──► normalise ──► chunk (≈900 chars, 150 overlap, sentence-aware)
                          ──► embed ──► KnowledgeChunk.embedding (vector)

answer:  question ──► classifyIntent ──► retrieval query
                  ──► pgvector cosine top-k (+ FAQ exact/keyword boost)
                  ──► confidence gate ──► build context ──► LLM (+ allowlisted tools)
                  ──► response validation ──► reply | escalate
```

`DemoAIProvider.generateEmbedding` is a deterministic hashed bag-of-words projection —
same dimensionality (1536), so switching to a real provider only requires re-embedding.

## 6. Tool calling

Tools are declared once in `lib/ai/tools/registry.ts` with a Zod schema, a
`requiresBusinessContext` flag and an executor. The agent loop can only invoke names
present in the registry, arguments are Zod-validated before execution, and executors
receive the server-resolved `BusinessContext` — never a business id from the model.

Allowlist: `get_business_hours`, `get_service_information`, `search_knowledge_base`,
`get_customer`, `create_customer`, `check_availability`, `create_appointment`,
`get_order_status`, `create_support_ticket`, `transfer_to_human`.

## 7. Data model (Prisma, UUID ids, `createdAt/updatedAt`, indexes on every FK + tenant key)

```
User ──< Membership >── Business
Business ──< Customer ──< Conversation ──< Message
                        └< Appointment >── Service
Business ──< Conversation (channel: VOICE|CHAT|EMAIL) ──< Call
Business ──< KnowledgeDocument ──< KnowledgeChunk (embedding vector(1536))
Business ──< FAQ, AIAgent (1:1), Integration, Notification, SupportTicket
Business ──< Subscription (plan STARTER|BUSINESS|PRO) ──< UsageRecord
```

Cascades: deleting a `Business` removes all tenant-owned rows; deleting a `User`
removes its memberships/sessions but never a business's conversations.

## 8. API surface (all under `app/api`)

```
POST   /auth/signup            POST /auth/login          POST /auth/logout
POST   /onboarding/business    PATCH /business            PATCH /agent
GET|POST /knowledge/documents  POST /knowledge/reindex    GET|POST /knowledge/faqs
POST   /chat/message           (public, widget-authenticated by publicWidgetId)
GET    /widget/config          GET  /widget.js
POST   /voice/webhook          POST /voice/simulate
GET|POST /appointments         GET  /availability
GET|POST /customers            GET|POST /tickets
GET    /analytics/overview     GET  /analytics/insights
POST   /team/invite            GET  /billing/usage
```

Every handler: Zod-validate → resolve session → assert role permission → tenant-scoped
query → structured JSON (`{ error: { code, message } }` on failure, never a stack trace).

## 9. Roles

`OWNER > ADMIN > AGENT > VIEWER`, checked server-side by
`lib/auth/permissions.ts:can(role, action)`. Client hiding is cosmetic only.

## 10. Technical risks

1. **pgvector + Prisma** — Prisma cannot express `vector`; handled with
   `Unsupported("vector(1536)")` in the schema plus raw SQL for insert/search.
2. **Latency of voice turns** — real telephony needs sub-second turns; the simulator
   makes this visible but the architecture (streaming-capable provider interface)
   defers the hard part until a provider is connected.
3. **Document parsing edge cases** — `pdf-parse` fails on scanned PDFs; ingestion
   records a per-document `status`/`error` instead of failing the request.
4. **Prompt injection via knowledge content** — retrieved text is wrapped in a
   delimited, clearly-labelled untrusted block, and tool execution never depends on
   retrieved text alone.
5. **Cost/abuse on public chat** — per-widget rate limiting (in-memory now, Redis
   documented) and usage records per conversation.

## 11. Features that need external APIs vs demo mode

| Feature | Without keys | With keys |
| --- | --- | --- |
| Chat answers, embeddings, insights | deterministic demo provider | real LLM |
| Voice calls | in-dashboard simulator (labelled) | telephony provider webhook |
| Document upload/parsing | fully local | same |
| Payments | plan/usage tracking only, labelled example pricing | Stripe adapter |
| Email/notifications | rows in `Notification` | SMTP/provider adapter |

## 12. Phases

1. Architecture (this doc) → 2. foundation (schema, auth, layout) → 3. dashboard,
onboarding, settings, team, customers → 4. knowledge + RAG → 5. chat + widget +
escalation → 6. voice + simulator → 7. appointments + tools → 8. analytics + insights →
9. billing/usage → 10. landing page, seed/demo data, SEO, a11y, tests, polish.
