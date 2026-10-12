# TalentSwap | Technology Specification Document v1.0

# TECHNOLOGY SPECIFICATION DOCUMENT

# TalentSwap

_Web Platform — Senior Architect Edition_

_A complete production-level architecture and technology specification for the TalentSwap points-based skill exchange platform_

| Document Type  | Technology Specification & Architecture Guide         |
| -------------- | ----------------------------------------------------- |
| Platform Scope | Web Application Only (Desktop & Mobile Browser)       |
| Authored By    | Senior Software Architect — TalentSwap Technical Team |
| Version        | 1.0 — Initial Architecture Specification              |
| Date           | May 2026                                              |

# 1. Project Overview

## 1.1 Platform Type and Nature

TalentSwap is a full-stack, server-rendered web application built around a community-driven, points-based skill and service exchange ecosystem. It operates as a two-sided marketplace where participants both produce and consume value, with SkillPoints serving as the medium of exchange in lieu of money. The platform spans three primary domains of complexity: a transactional marketplace (points wallet, escrow, exchange verification), a social network (profiles, reputation, gamification, community board), and a real-time communication suite (WebSocket chat, WebRTC voice and video).

Because the platform is exclusively web-based, the architecture must deliver an experience that is fast, responsive, and functionally complete across both desktop and mobile browsers without relying on native device APIs. Progressive Web App (PWA) principles will be applied to bridge the gap for mobile browser users, enabling features such as push notifications, offline caching of static assets, and home screen installation without a native application.

## 1.2 Scale Assumptions

The architecture is designed to serve the following scale targets, divided across two planning horizons:

| Metric                  | Year 1 (MVP → Growth)   |
| ----------------------- | ----------------------- |
| Registered Users        | 0 – 25,000              |
| Monthly Active Users    | 0 – 10,000              |
| Concurrent Users (Peak) | 500 – 2,000             |
| Transactions / Day      | 200 – 5,000             |
| File Storage            | Up to 500 GB            |
| Active WebSocket Conns  | Up to 2,000             |
| DB Read/Write Ratio     | ~80% reads / 20% writes |
| API Requests / Day      | 250,000 – 2,000,000     |

_These targets inform all technology choices below. The architecture begins as a well-structured monolith and is designed with explicit extraction points to enable migration toward microservices when load justifies it._

## 1.3 Expected User Interactions

The platform must support the following categories of user interaction simultaneously and without degradation in experience:

- Authentication and session management across multiple devices simultaneously.
- Real-time text messaging between matched skill partners via WebSocket connections.
- In-browser peer-to-peer voice and video calling sessions via WebRTC with TURN server fallback.
- Transactional operations including SkillPoints deductions, escrow holds, dual-confirmation flags, and post-confirmation disbursements — each requiring strict ACID compliance.
- File uploads for profile images, credential documents, and portfolio attachments — including server-side virus scanning and document type validation.
- Search and filtering operations over a growing catalogue of user profiles and skill listings, requiring full-text search capabilities.
- Push notifications for transaction events, chat messages, badge awards, and administrative alerts.
- Admin dashboard operations including user moderation, content review, document verification queues, and platform analytics.

# 2. Recommended Technology Stack

## 2.1 Frontend

### 2.1.1 Framework — Next.js 14 (React)

Next.js is the recommended frontend framework. It combines the component model of React with server-side rendering (SSR), static site generation (SSG), and the App Router architecture introduced in version 13/14, which enables per-route rendering strategies. For TalentSwap, SSR is critical for search engine discoverability of public profile and skill-listing pages, while client-side rendering handles interactive, authenticated dashboard experiences. The built-in API routes capability also allows lightweight server-side logic (e.g., file upload pre-signing) without a separate service.

| Technology         | Why Best Choice                                                                               | Advantages                                                                                         | Disadvantages                                                                         | Alternatives                                                  |
| ------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Next.js 14 (React) | SSR + CSR hybrid; App Router; built-in image optimisation; API routes; large ecosystem        | Excellent SEO for public pages; file-based routing; streaming SSR; TypeScript-first                | Larger bundle than bare React; App Router learning curve; opinionated structure       | Nuxt.js (Vue), SvelteKit, Remix                               |
| TypeScript         | Type safety across entire codebase reduces runtime errors and improves refactoring confidence | Compile-time error detection; IDE autocompletion; self-documenting code; better team collaboration | Adds compilation step; initial setup overhead; steeper learning curve for junior devs | JavaScript (strongly discouraged for a project of this scale) |

### 2.1.2 State Management — Zustand + TanStack Query

Global UI state (authentication context, theme, notification count) is managed with Zustand — a lightweight, boilerplate-free store that integrates cleanly with React Server Components. Server state (API data, pagination, cache invalidation) is managed with TanStack Query (formerly React Query), which handles request deduplication, background refetching, and optimistic updates out of the box. This separation of concerns avoids the bloat of Redux for a project that does not require complex client-side business logic.

| Technology     | Why Best Choice                                                                        | Advantages                                                                                        | Disadvantages                                                                              | Alternatives                     |
| -------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------- |
| Zustand        | Minimal API; no boilerplate; works with SSR; 2 KB gzipped                              | Simple mental model; DevTools support; easy async actions; no Provider wrapper needed             | Less structured than Redux; less opinionated (can be a disadvantage on large teams)        | Redux Toolkit, Jotai, Recoil     |
| TanStack Query | Purpose-built for server state; automatic caching, background sync, and error recovery | Reduces custom fetch logic by ~70%; stale-while-revalidate; request deduplication; mutation hooks | Adds abstraction layer over fetch; requires understanding of cache invalidation strategies | SWR, Apollo Client (for GraphQL) |

### 2.1.3 Styling — Tailwind CSS + shadcn/ui

Tailwind CSS provides a utility-first styling approach that eliminates context switching between CSS files and component code, and enforces visual consistency through a design token system. shadcn/ui provides a curated set of accessible, unstyled Radix UI primitives pre-styled with Tailwind, enabling rapid assembly of complex components (modals, dropdowns, date pickers, data tables) without introducing a heavy third-party design system.

| Technology   | Why Best Choice                                                                            | Advantages                                                                                       | Disadvantages                                                                          | Alternatives                            |
| ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------- |
| Tailwind CSS | Zero runtime CSS; PurgeCSS-integrated; responsive by default; consistent design tokens     | Small production CSS bundle; no naming conflicts; excellent documentation; Figma-to-code mapping | Long className strings; requires familiarity; not ideal for dynamic style calculations | CSS Modules, Styled Components, Emotion |
| shadcn/ui    | Code-owned components (not a dependency); built on Radix UI for accessibility; fully typed | Full customisation control; WCAG 2.1 compliant; no version lock-in; tree-shakeable               | Manual component management; larger initial setup than a pre-built UI library          | MUI, Chakra UI, Ant Design              |

### 2.1.4 Form Handling — React Hook Form + Zod

React Hook Form uses uncontrolled inputs and a ref-based model, minimising re-renders on every keystroke — a significant performance advantage for complex forms such as the registration wizard, skill listing editor, and transaction confirmation dialogs. Zod provides runtime schema validation that is shared between frontend and backend, eliminating duplicated validation logic and ensuring that the server and client agree on data shapes at the type level.

| Technology            | Why Best Choice                                                                       | Advantages                                                                         | Disadvantages                                                                          | Alternatives                   |
| --------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------ |
| React Hook Form + Zod | Minimal re-renders; schema-driven validation; shared types with backend via zod-infer | High performance; excellent DevTools; built-in async validation; TypeScript native | Slightly more setup than Formik; Zod schemas must be kept in sync with backend schemas | Formik + Yup, React Final Form |

### 2.1.5 Routing — Next.js App Router

The Next.js App Router handles all client and server routing. Route groups enable logical separation of the public (unauthenticated) and authenticated areas of the application without affecting the URL structure. Parallel routes and intercepting routes allow modal-based UX patterns — such as opening a user profile within a search result page — without navigating away from the current context.

### 2.1.6 Scalability Considerations — Frontend

- Next.js supports incremental static regeneration (ISR) for semi-static pages (e.g., skill category landing pages), reducing origin server load.
- Dynamic imports and React Suspense enable code splitting so that heavy components (video calling, rich text editor, admin charts) are only loaded when accessed.
- PWA manifest and service worker (via next-pwa) enable installability and offline asset caching for returning mobile browser users.

## 2.2 Backend

### 2.2.1 Runtime — Node.js 20 LTS

Node.js is the appropriate runtime for TalentSwap's backend. Its non-blocking I/O model is well-suited to the platform's I/O-heavy workload — API requests, database queries, file operations, and WebSocket connections — all of which spend most of their time waiting for external operations rather than performing CPU-intensive computation. Node.js 20 LTS brings native fetch, improved worker threads, and a stable, long-term supported foundation.

| Technology     | Why Best Choice                                                                          | Advantages                                                                         | Disadvantages                                                                                | Alternatives                                   |
| -------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Node.js 20 LTS | Non-blocking I/O; shared language with frontend; massive npm ecosystem; WebSocket-native | High concurrency for I/O-bound workloads; npm ecosystem breadth; excellent tooling | Not optimal for CPU-bound tasks; single-threaded (requires worker threads for heavy compute) | Python (FastAPI), Go (Gin), Java (Spring Boot) |

### 2.2.2 Framework — NestJS

NestJS is the recommended backend framework. Built on Express.js with a modular, Angular-inspired architecture, it provides dependency injection, decorators, guards, interceptors, and pipes out of the box — all of which align directly with TalentSwap's requirements: authentication guards, request validation pipes, response transformation interceptors, and a clean module structure that maps naturally to the platform's domain boundaries (Users, Skills, Transactions, Notifications, etc.). Its native WebSocket gateway support and first-class TypeScript integration make it the optimal choice for a project of this complexity.

| Technology | Why Best Choice                                                                                         | Advantages                                                                                                               | Disadvantages                                                                               | Alternatives                          |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------- |
| NestJS     | Opinionated structure prevents architectural drift; built-in DI; WebSocket gateways; OpenAPI generation | Highly maintainable at scale; excellent documentation; guards/pipes/interceptors reduce boilerplate; Swagger integration | Steeper learning curve; over-engineered for very simple APIs; opinionated class-based style | Express.js (raw), Fastify, Hono, tRPC |

### 2.2.3 API Architecture — REST with WebSocket Supplement

The primary API is RESTful, versioned under `/api/v1/`. REST is chosen over GraphQL for the core API because the platform's data access patterns are well-defined and predictable, the team is unlikely to need the arbitrary query flexibility that GraphQL provides, and REST has simpler caching semantics at the CDN and reverse proxy level. WebSocket connections, managed through NestJS's built-in Socket.io gateway, handle real-time events (chat, notifications, transaction status updates, call signalling) as a complementary layer.

| Technology        | Why Best Choice                                                                                 | Advantages                                                                                          | Disadvantages                                                                                                      | Alternatives                 |
| ----------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| REST API (NestJS) | Well-understood; HTTP cache-friendly; straightforward to secure and rate-limit; tooling breadth | Broad client support; CDN-cacheable GET responses; simpler debugging; OpenAPI/Swagger native        | Over-fetching/under-fetching on complex UIs; multiple round-trips for related data                                 | GraphQL (Apollo), tRPC, gRPC |
| Socket.io Gateway | Full-duplex real-time communication; automatic fallback to long-polling; room/namespace support | Handles connection management; rooms enable per-user/per-conversation event scoping; binary support | Maintains persistent connections (server memory per connection); requires sticky sessions in clustered deployments | raw WebSocket, SSE, Pusher   |

### 2.2.4 Authentication Strategy — JWT + Refresh Tokens

Authentication is implemented using short-lived JSON Web Tokens (access tokens, 15-minute expiry) paired with long-lived, securely stored refresh tokens (httpOnly cookies, 30-day expiry). Access tokens are stateless and validated at the API layer without a database round-trip, preserving performance. Refresh tokens are stored in the database (enabling revocation on logout or suspicious activity detection) and rotated on every use to prevent replay attacks. OAuth 2.0 social login (Google, LinkedIn) is supported as an additional authentication pathway via Passport.js strategies.

| Technology                   | Why Best Choice                                                                        | Advantages                                                                                                         | Disadvantages                                                                                                      | Alternatives                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| JWT + Refresh Token Rotation | Stateless access token validation; revocable refresh tokens; industry standard pattern | Scalable (no session store lookup for access token validation); supports logout from all devices; OAuth-compatible | Access tokens cannot be instantly revoked (mitigated by short expiry); requires careful httpOnly cookie management | Session-based auth (express-session), Clerk, Auth0 managed service |

### 2.2.5 Scalability — Backend

- NestJS's modular architecture allows individual modules to be extracted into separate microservices when load requires it — the Transaction module is the primary candidate given its ACID requirements and high criticality.
- The Fastify adapter can replace the default Express adapter in NestJS for a ~20–30% throughput improvement at scale without changing application code.
- Worker threads (via Node.js `worker_threads`) handle CPU-bound operations such as document analysis, image processing, and fraud scoring without blocking the event loop.

## 2.3 Database

### 2.3.1 Primary Database — PostgreSQL 16

PostgreSQL is the unambiguous choice for TalentSwap's primary datastore. The platform's core operations — transaction management, points ledger, user relationships, exchange records — are inherently relational and require ACID-compliant transactions with strong consistency guarantees. PostgreSQL's support for row-level locking, advisory locks, JSONB columns (for flexible metadata), full-text search with tsvector, and mature replication makes it exceptionally well-suited to this workload.

The decision to use SQL rather than NoSQL is deliberate. NoSQL databases such as MongoDB offer schema flexibility and horizontal write scaling, but they do so at the cost of transaction integrity — a trade-off that is unacceptable for a financial-grade points economy where partial writes, double spends, or race conditions would undermine platform trust entirely.

| Technology    | Why Best Choice                                                                                | Advantages                                                                                                           | Disadvantages                                                                                                | Alternatives                                        |
| ------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| PostgreSQL 16 | ACID-compliant; row-level locking; JSONB; full-text search; mature replication; advisory locks | Battle-tested reliability; rich query planner; pg_trgm for fuzzy search; excellent ORM support; free and open-source | Vertical scaling ceiling (mitigated by read replicas and connection pooling); schema migrations require care | MySQL 8, CockroachDB (distributed), MongoDB (NoSQL) |

### 2.3.2 ORM — Prisma

Prisma provides a type-safe query builder and schema management tool that generates TypeScript types directly from the database schema. This eliminates an entire class of runtime type mismatches between database records and application code. Prisma Migrate handles schema versioning in development, while production migrations are managed through a CI-gated migration step. Prisma Accelerate (connection pooling) is used in production to manage PostgreSQL connection limits efficiently.

| Technology | Why Best Choice                                                                             | Advantages                                                                                             | Disadvantages                                                                                     | Alternatives                                      |
| ---------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Prisma ORM | Type-safe queries; auto-generated TypeScript client; schema-first approach; Migrate support | Zero runtime type errors on DB queries; excellent DX; works with Next.js API routes; relation handling | Slightly slower than raw SQL for complex queries; migration workflows require discipline in teams | Drizzle ORM (lighter), TypeORM, Sequelize, raw pg |

### 2.3.3 Caching Layer — Redis 7

Redis serves multiple roles in the TalentSwap stack. As a cache, it stores frequently accessed, slow-changing data such as user profile cards, skill category lists, and leaderboard rankings — reducing database read load on hot paths. As a session store for WebSocket room membership and Socket.io adapter state, it enables horizontal scaling of real-time connections across multiple server instances. As a queue backend (via BullMQ), it manages background job processing for email notifications, document analysis, and gamification event evaluation.

| Technology | Why Best Choice                                                                                     | Advantages                                                                                | Disadvantages                                                                                          | Alternatives                                               |
| ---------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Redis 7    | In-memory performance; pub/sub; sorted sets for leaderboards; BullMQ integration; Socket.io adapter | Sub-millisecond reads; atomic operations; TTL-based expiry; excellent persistence options | RAM-based (cost at scale); not a primary datastore; requires persistence configuration for reliability | Memcached (simpler but fewer features), KeyDB, DragonflyDB |

### 2.3.4 Search — PostgreSQL Full-Text Search → Elasticsearch

In the MVP phase, PostgreSQL's built-in full-text search (tsvector/tsquery with pg_trgm for fuzzy matching) is sufficient for skill and user search. When the user base exceeds approximately 50,000 profiles or search latency degrades beyond acceptable thresholds, the search functionality is extracted to Elasticsearch or OpenSearch, with a background sync job keeping the search index updated from the primary database.

## 2.4 Storage

### 2.4.1 Document and Media Storage — Cloudflare R2 or AWS S3

All user-uploaded files — profile images, credential documents, portfolio attachments, and chat media — are stored in object storage rather than the application server filesystem. Cloudflare R2 is the primary recommendation: it is S3-compatible (meaning all existing S3 SDK code works unchanged), has zero egress fees (a significant cost saving for a platform serving many file downloads), and integrates natively with Cloudflare's global CDN. AWS S3 is the fallback alternative if the team has existing AWS infrastructure.

Files are never uploaded directly to the backend server. Instead, the backend generates a presigned URL that grants the browser temporary write access directly to the storage bucket. This eliminates the server as a bottleneck for large file uploads and protects against server-side memory exhaustion from multi-part upload streams.

| Technology    | Why Best Choice                                                                            | Advantages                                                                                        | Disadvantages                                                                               | Alternatives                                            |
| ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Cloudflare R2 | Zero egress fees; S3-compatible API; global edge caching via Cloudflare CDN; WORM policies | Cost-effective at scale; no vendor lock-in (S3-compatible); integrated CDN; simple access control | Newer product (less community history than S3); some advanced S3 features not yet available | AWS S3 + CloudFront, Backblaze B2, Google Cloud Storage |

### 2.4.2 CDN

Cloudflare serves as the CDN for both static assets (JavaScript bundles, CSS, images) and user-uploaded content served from R2. For teams choosing AWS, CloudFront is the equivalent. The CDN sits in front of the entire application, providing DDoS protection, caching at edge nodes, and TLS termination — reducing origin server load and improving global response times.

## 2.5 Real-Time Features

### 2.5.1 WebSocket — Socket.io

Socket.io, integrated via NestJS's WebSocket gateway, handles all persistent real-time connections: chat message delivery, notification push, transaction status updates, and WebRTC call signalling. Socket.io's namespace and room model maps cleanly onto the platform's domain: each conversation has a room, each authenticated user has a personal notification room, and admin events fire on a separate admin namespace. The Redis adapter for Socket.io enables WebSocket connections to be distributed across multiple server instances without losing message delivery guarantees.

### 2.5.2 Voice and Video Calling — WebRTC with Agora SDK

In-browser voice and video calling is implemented using WebRTC, which provides peer-to-peer media streaming directly between browsers, bypassing the server for media data and dramatically reducing infrastructure costs. The recommended managed service provider is Agora.io, whose SDK abstracts the complexity of ICE/STUN/TURN negotiation, browser compatibility quirks, adaptive bitrate management, and network condition handling into a clean JavaScript API. The TalentSwap backend is responsible for token generation for Agora channel access, ensuring that only authorised, matched users can join a given call session.

As a cost-free alternative for the MVP, the platform may self-host a Coturn TURN server on a small VPS, with WebRTC signalling handled via Socket.io. This requires more operational maintenance but eliminates per-minute calling costs at low scale.

| Technology         | Why Best Choice                                                                           | Advantages                                                                                               | Disadvantages                                                                                      | Alternatives                                            |
| ------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| WebRTC + Agora SDK | Peer-to-peer media; managed TURN/STUN infrastructure; adaptive bitrate; recording options | No media traversal through server (low cost, low latency); cross-browser support; active SDK maintenance | Per-minute cost at scale; vendor dependency for managed TURN; requires token server implementation | Daily.co, Twilio Video, Jitsi (self-hosted), 100ms.live |

## 2.6 Security Layer

| Area               | Implementation                                                                                                                                                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication     | JWT (RS256 asymmetric signing) + httpOnly refresh token cookies; Passport.js OAuth 2.0 strategies; 2FA via TOTP (speakeasy library) for verified accounts                                                                                                                              |
| Authorisation      | Role-Based Access Control (RBAC) via NestJS Guards: roles User, VerifiedUser, Moderator, Admin. All route handlers decorated with `@Roles()` guard; resource-level ownership checks in service layer                                                                                   |
| API Security       | Helmet.js (HTTP security headers); CORS whitelist (origin allowlist, not wildcard); express-rate-limit (Redis-backed, per-IP and per-user limits); request size limits; CSRF tokens for state-mutating browser requests                                                                |
| Input Validation   | Zod schemas on all API endpoints (NestJS ValidationPipe with class-validator); SQL injection prevention via Prisma parameterised queries; XSS prevention via DOMPurify on client and sanitize-html on server for user-generated content                                                |
| Encryption         | TLS 1.3 enforced at CDN/load balancer; AES-256-GCM for sensitive document metadata at rest; bcrypt (cost factor 12) for password hashing; SRTP/DTLS encryption for WebRTC media streams                                                                                                |
| File Upload Safety | Presigned URL upload with file type validation (MIME type and magic bytes); server-side ClamAV antivirus scan post-upload; file size limits enforced at CDN; document content stripped of macros/scripts via LibreOffice headless conversion before storage                            |
| Fraud Prevention   | Double-entry ledger accounting for all SkillPoints transactions; idempotency keys on transaction API calls; row-level advisory locks to prevent concurrent double-spend; anomaly detection job (flagging unusual point accumulation velocity); admin review queue for flagged accounts |
| DDoS Protection    | Cloudflare WAF and rate limiting at network edge; origin IP concealment behind Cloudflare proxy; challenge pages for suspicious traffic patterns                                                                                                                                       |

## 2.7 DevOps and Deployment

### 2.7.1 Hosting

The recommended hosting strategy separates concerns across specialised providers: the Next.js frontend is deployed on Vercel, which provides automatic CDN distribution, preview deployments per pull request, and seamless integration with the Next.js build pipeline. The NestJS backend API is containerised with Docker and deployed on a managed container platform — Railway or Render for the MVP, migrating to AWS ECS (Fargate) or GCP Cloud Run when scale demands it. The PostgreSQL database is hosted on Supabase (managed PostgreSQL with connection pooling via PgBouncer) or AWS RDS for production.

| Technology                      | Why Best Choice                                                                    | Advantages                                                                                     | Disadvantages                                                                                      | Alternatives                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Vercel (Frontend)               | Built for Next.js; automatic Edge deployment; preview URLs per PR; zero-config CDN | Fastest DX for Next.js; global CDN; automatic HTTPS; seamless CI integration                   | Commercial pricing at scale; vendor lock-in for advanced features; less control over server config | Netlify, AWS Amplify, self-hosted (Nginx + PM2)                     |
| Railway / Render (Backend MVP)  | Simple container deployment; automatic TLS; managed databases; GitHub integration  | Zero infrastructure management; affordable for early-stage; fast deployment; secret management | Limited control at scale; not suitable for high-throughput production; single-region by default    | AWS ECS (Fargate), GCP Cloud Run, Fly.io, DigitalOcean App Platform |
| AWS ECS Fargate (Backend Scale) | Serverless containers; auto-scaling; integrates with RDS, ElastiCache, CloudWatch  | No server management; horizontal scaling on demand; deep AWS ecosystem integration; SLA-backed | Steep AWS learning curve; higher operational complexity; cost management requires vigilance        | GCP Cloud Run, Kubernetes (EKS), Azure Container Instances          |

### 2.7.2 CI/CD — GitHub Actions

GitHub Actions drives the entire CI/CD pipeline. On every pull request, the pipeline runs TypeScript compilation, unit tests, integration tests against a test database, and Prisma schema validation. On merge to the main branch, it executes a production build, runs database migrations (with automatic rollback on failure), pushes the Docker image to the container registry, and triggers a deployment to the hosting environment. Environment secrets are managed through GitHub Secrets and injected at build time.

### 2.7.3 Containerisation — Docker + Docker Compose

All backend services are containerised with Docker. Docker Compose orchestrates the local development environment (API, PostgreSQL, Redis, Mailhog for email testing), ensuring that every developer works against an identical environment regardless of their operating system. Production containers follow a multi-stage build pattern to keep image sizes minimal, and all images are scanned for known CVEs via Trivy or Snyk before deployment.

### 2.7.4 Reverse Proxy and Load Balancing — Nginx

Nginx acts as the reverse proxy and load balancer in self-hosted deployments. It terminates TLS, applies gzip/brotli compression, enforces request size limits, and distributes traffic across multiple Node.js instances via upstream round-robin. WebSocket connections require Nginx's `proxy_pass` with upgraded connections (`proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade;`), which is configured in the WebSocket server block.

### 2.7.5 Monitoring and Logging

| Area                      | Technology                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Application Monitoring    | Sentry — error tracking, performance monitoring, and session replay for frontend and backend                                       |
| Infrastructure Monitoring | Prometheus + Grafana — custom dashboards for API latency, DB query times, WebSocket connection count, queue depth, and error rates |
| Log Aggregation           | Winston (structured JSON logging in backend) → shipped to Loki or CloudWatch Logs for centralised querying                         |
| Uptime Monitoring         | BetterUptime or UptimeRobot — HTTP health check probes with on-call alerting via PagerDuty or email                                |
| Database Monitoring       | pgBadger for slow query analysis; pg_stat_statements for query-level performance telemetry                                         |

## 2.8 Performance Optimisation

| Area                 | Strategy                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP Caching         | Cache-Control headers on all GET endpoints; stale-while-revalidate for user profile cards and skill listings; ETag support for conditional requests                       |
| Database Query Cache | Redis cache layer (TTL 5–60 minutes) wrapping the most expensive read queries: leaderboards, skill category aggregations, platform statistics                             |
| Connection Pooling   | PgBouncer (via Supabase or self-hosted) maintains a warm pool of PostgreSQL connections, preventing connection exhaustion under concurrent API load                       |
| Image Optimisation   | Next.js `<Image>` component with automatic WebP conversion and responsive srcset generation; profile images resized to standard dimensions at upload time (Sharp library) |
| Frontend Performance | Code splitting per route; React Suspense for deferred rendering; lazy loading of heavy components (video calling, rich text); font subsetting; critical CSS inlining      |
| Database Indexing    | Composite indexes on `(user_id, created_at)` for paginated feeds; partial indexes for active record filtering; GIN index on skill_tags for full-text search               |
| CDN                  | All static assets and user-uploaded content served from Cloudflare edge nodes; Cache-Control max-age=31536000 for immutable versioned assets                              |

## 2.9 Scalability Architecture

### 2.9.1 Monolith → Modular Monolith → Microservices

The platform launches as a well-structured modular monolith. NestJS's module system naturally mirrors the domain structure, and each module communicates only through defined service interfaces — a discipline that makes future extraction into microservices a refactoring exercise rather than a rewrite. The modules most likely to require independent scaling and extraction are:

- Transaction Service — high criticality, ACID-required, potential regulatory scrutiny.
- Notification Service — high fan-out, can be made fully async via message queue.
- Real-Time Service (Socket.io) — connection-heavy, benefits from independent horizontal scaling.
- AI/ML Service — CPU-intensive, benefits from dedicated Python workers isolated from the Node.js runtime.

### 2.9.2 Queue System — BullMQ

BullMQ (backed by Redis) handles all asynchronous background processing, including email dispatch, push notifications, gamification badge evaluation, document virus scanning, fraud score recalculation, and search index synchronisation. This ensures that user-facing API responses are never blocked by slow I/O operations, and that expensive processing is retried automatically on failure with configurable backoff strategies.

### 2.9.3 Horizontal Scaling

The Node.js API is stateless with respect to user sessions (JWT-based), meaning multiple instances can be run behind a load balancer without session affinity requirements. The only stateful component is the Socket.io server, which requires the Redis adapter to broadcast events across instances. Database read load is distributed across PostgreSQL read replicas for SELECT-heavy operations.

# 3. System Architecture

## 3.1 High-Level Architecture

The following describes the major layers of the TalentSwap system and how traffic flows from user request to data response:

> User Browser → Cloudflare CDN / WAF → Vercel Edge (Next.js Frontend) → NestJS REST API → PostgreSQL / Redis / R2 Storage → BullMQ Workers → External Services (Agora, SendGrid, ClamAV)

Cloudflare sits at the network edge and handles TLS termination, DDoS mitigation, and static asset caching. The Next.js application, deployed on Vercel, serves the web UI and performs server-side rendering for public pages. Authenticated user interactions generate API requests to the NestJS backend, which communicates with PostgreSQL for durable data, Redis for caching and pub/sub, and Cloudflare R2 for file retrieval. Background workers process queued jobs independently of the request cycle.

## 3.2 Request Flow — Standard API Request

1. Browser sends an HTTPS request to the Next.js application (Vercel Edge).
2. For authenticated API calls, the Next.js server-side layer or client-side fetch sends a request to `/api/v1/{resource}` on the NestJS backend with the JWT access token in the Authorization header.
3. NestJS AuthGuard validates the JWT signature (using the RS256 public key), extracts the user payload, and injects the user context into the request pipeline.
4. The appropriate Controller handler delegates to the Service layer, which queries PostgreSQL via Prisma or reads from the Redis cache.
5. The response is serialised, transformed via a NestJS Interceptor (e.g., to exclude sensitive fields), and returned to the client as a JSON response.
6. On the client, TanStack Query updates its cache and triggers a re-render of affected components.

## 3.3 Real-Time Communication Flow

1. On application load, the authenticated client establishes a Socket.io connection to the NestJS WebSocket gateway, authenticating via a one-time handshake token derived from the JWT.
2. The gateway joins the user to their personal notification room (`user:{userId}`) and any active conversation rooms (`conversation:{conversationId}`).
3. When a chat message is sent, the client emits a `message:send` event. The gateway handler validates the payload, persists the message to PostgreSQL, and emits a `message:received` event to all sockets in the target conversation room.
4. Transaction status events (e.g., `escrow_funded`, `completion_confirmed`, `points_distributed`) are emitted to the relevant users' personal notification rooms by the Transaction Service upon state changes.
5. In horizontally scaled deployments, the Redis pub/sub adapter ensures that events emitted by one server instance are propagated to sockets connected to other instances.

## 3.4 Transaction Flow — Escrow with Dual Confirmation

1. Recipient initiates a transaction request through the UI. Frontend calls `POST /api/v1/transactions` with the transaction parameters.
2. Transaction Service opens a PostgreSQL transaction (`BEGIN`). It checks the recipient's SkillPoints balance with a row-level lock (`SELECT ... FOR UPDATE`) to prevent concurrent double-spend.
3. If the balance is sufficient, it deducts the points from the recipient's wallet and creates a TransactionPool record in status `ESCROW_HELD`. It commits the database transaction and returns the transaction ID to the client.
4. Both parties receive a real-time WebSocket notification (`transaction:escrow_funded`) prompting them to confirm session completion.
5. Each party calls `POST /api/v1/transactions/{id}/confirm`. The service sets the respective confirmation flag (`provider_confirmed` or `recipient_confirmed`).
6. When both flags are TRUE, a BullMQ job is enqueued to finalise the transaction: points are transferred from the pool to the provider's wallet, the transaction status is set to `COMPLETED`, and both parties receive a WebSocket notification (`transaction:completed`) along with a prompt to submit a rating.
7. If the confirmation window expires without both confirmations, the transaction is escalated to `DISPUTED` status and added to the admin moderation queue.

## 3.5 File Upload Flow

1. Client selects a file. Frontend validates file type and size client-side (first line of defence only).
2. Frontend calls `POST /api/v1/storage/presign` with the filename and MIME type.
3. Backend validates the request, generates a time-limited presigned PUT URL pointing directly to the R2/S3 bucket, and returns it to the client. The file path is logged as `PENDING` in the Documents table.
4. Frontend uploads the file directly to R2/S3 using the presigned URL via a PUT request. No file data passes through the backend server.
5. On successful upload, the frontend calls `POST /api/v1/storage/confirm` with the file key. The backend enqueues a BullMQ job for antivirus scanning (ClamAV daemon) and document type verification.
6. Upon scan completion, the document status is updated to `PENDING_REVIEW` or `REJECTED` (if malicious content is detected). Admin moderators review documents from the verification queue in the admin dashboard.

## 3.6 Authentication Flow

1. User submits login credentials. Backend validates password (bcrypt compare) against the stored hash.
2. On success, the backend generates an RS256-signed JWT access token (15-minute expiry) and a cryptographically random refresh token (stored hashed in the database, set as httpOnly + Secure cookie).
3. The access token is returned in the JSON response body and stored in memory (NOT in localStorage, to prevent XSS token theft).
4. On subsequent API requests, the access token is sent in the `Authorization: Bearer {token}` header.
5. When the access token expires, the client silently calls `POST /api/v1/auth/refresh`. The server validates the httpOnly cookie, verifies the refresh token hash, rotates the refresh token (new token issued, old token invalidated in DB), and returns a new access token.
6. On logout, the client calls `POST /api/v1/auth/logout`. The server invalidates the refresh token in the database. The client discards the in-memory access token.

# 4. Database Design Recommendations

## 4.1 Core Tables

### 4.1.1 `users`

| Column / Field   | Type         | Constraints                   | Description                                                             |
| ---------------- | ------------ | ----------------------------- | ----------------------------------------------------------------------- |
| `id`             | UUID         | PK, DEFAULT gen_random_uuid() | Primary key — UUID preferred over serial to prevent enumeration attacks |
| `email`          | VARCHAR(255) | UNIQUE, NOT NULL              | Hashed on read comparison; verified via email confirmation flow         |
| `password_hash`  | VARCHAR(255) | NOT NULL                      | bcrypt hash (cost 12); NULL for OAuth-only accounts                     |
| `role`           | ENUM         | DEFAULT 'user'                | Values: user \| verified_user \| moderator \| admin                     |
| `email_verified` | BOOLEAN      | DEFAULT false                 | Set to true upon email confirmation token validation                    |
| `is_banned`      | BOOLEAN      | DEFAULT false                 | Soft ban flag; banned users cannot log in or initiate transactions      |
| `oauth_provider` | VARCHAR(50)  | NULLABLE                      | google \| linkedin \| NULL for email/password accounts                  |
| `oauth_id`       | VARCHAR(255) | NULLABLE, UNIQUE              | External provider user ID for OAuth accounts                            |
| `created_at`     | TIMESTAMPTZ  | DEFAULT NOW()                 | Account creation timestamp with timezone                                |
| `updated_at`     | TIMESTAMPTZ  | DEFAULT NOW()                 | Auto-updated via trigger or ORM hook on every record mutation           |

### 4.1.2 `profiles`

| Column / Field       | Type         | Constraints           | Description                                                                      |
| -------------------- | ------------ | --------------------- | -------------------------------------------------------------------------------- |
| `id`                 | UUID         | PK                    | Profile primary key — 1-to-1 with users                                          |
| `user_id`            | UUID         | FK → users.id, UNIQUE | One-to-one relationship with users table                                         |
| `display_name`       | VARCHAR(100) | NOT NULL              | Publicly visible name; may differ from legal name                                |
| `bio`                | TEXT         | NULLABLE              | Free-text biography; sanitised via server-side HTML stripping                    |
| `avatar_url`         | VARCHAR(500) | NULLABLE              | R2/S3 object key for profile image                                               |
| `location`           | VARCHAR(150) | NULLABLE              | City/region for local matching; not a precise address                            |
| `skill_points`       | INTEGER      | DEFAULT 0, CHECK >= 0 | Current SkillPoints balance; enforced non-negative by CHECK constraint           |
| `reputation_score`   | DECIMAL(3,2) | DEFAULT 0.00          | Rolling weighted average of received ratings (0.00–5.00)                         |
| `total_exchanges`    | INTEGER      | DEFAULT 0             | Denormalised counter for total completed exchanges                               |
| `is_verified`        | BOOLEAN      | DEFAULT false         | Set to true by admin/moderator after credential review                           |
| `verification_badge` | VARCHAR(50)  | NULLABLE              | Badge type awarded on verification (e.g., professional, academic)                |
| `experience_level`   | ENUM         | DEFAULT 'bronze'      | bronze \| silver \| gold \| platinum \| champion — gamification tier             |
| `experience_points`  | INTEGER      | DEFAULT 0             | Accumulated XP driving level progression                                         |
| `last_active_at`     | TIMESTAMPTZ  | NULLABLE              | Updated on every authenticated API request; used for activity streak calculation |

### 4.1.3 `skills`

| Column / Field  | Type         | Constraints              | Description                                                    |
| --------------- | ------------ | ------------------------ | -------------------------------------------------------------- |
| `id`            | UUID         | PK                       | Skill listing primary key                                      |
| `user_id`       | UUID         | FK → users.id            | Owning user                                                    |
| `title`         | VARCHAR(150) | NOT NULL                 | Skill name (e.g., Python Programming, Guitar Teaching)         |
| `description`   | TEXT         | NOT NULL                 | Detailed description of the skill offering                     |
| `category_id`   | INTEGER      | FK → skill_categories.id | Hierarchical skill taxonomy                                    |
| `proficiency`   | ENUM         | NOT NULL                 | beginner \| intermediate \| advanced \| expert                 |
| `type`          | ENUM         | NOT NULL                 | offering \| seeking — used for bidirectional matching          |
| `point_rate`    | INTEGER      | DEFAULT 10               | SkillPoints per hour; can be negotiated per session            |
| `is_active`     | BOOLEAN      | DEFAULT true             | Soft-delete flag; inactive skills excluded from search         |
| `search_vector` | TSVECTOR     | GENERATED ALWAYS AS...   | Auto-generated tsvector for full-text search; indexed with GIN |
| `created_at`    | TIMESTAMPTZ  | DEFAULT NOW()            | Listing creation timestamp                                     |

### 4.1.4 `transactions`

| Column / Field          | Type        | Constraints    | Description                                                                                               |
| ----------------------- | ----------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                    | UUID        | PK             | Transaction primary key — used as idempotency key                                                         |
| `initiator_id`          | UUID        | FK → users.id  | User who initiated the transaction (the recipient of the service)                                         |
| `provider_id`           | UUID        | FK → users.id  | User providing the skill or service                                                                       |
| `skill_id`              | UUID        | FK → skills.id | Skill being exchanged                                                                                     |
| `type`                  | ENUM        | NOT NULL       | one_way \| two_way — determines point distribution logic                                                  |
| `points_held`           | INTEGER     | NOT NULL       | Points deducted from initiator and held in escrow pool                                                    |
| `status`                | ENUM        | NOT NULL       | pending \| escrow_held \| provider_confirmed \| recipient_confirmed \| completed \| disputed \| cancelled |
| `provider_confirmed`    | BOOLEAN     | DEFAULT false  | Completion confirmation from the skill provider                                                           |
| `recipient_confirmed`   | BOOLEAN     | DEFAULT false  | Completion confirmation from the skill recipient                                                          |
| `confirmation_deadline` | TIMESTAMPTZ | NOT NULL       | Timestamp after which unconfirmed transactions auto-escalate to disputed                                  |
| `idempotency_key`       | UUID        | UNIQUE         | Client-supplied key preventing duplicate transaction submissions                                          |
| `notes`                 | TEXT        | NULLABLE       | Optional session notes agreed upon by both parties                                                        |
| `created_at`            | TIMESTAMPTZ | DEFAULT NOW()  | Transaction initiation timestamp                                                                          |
| `completed_at`          | TIMESTAMPTZ | NULLABLE       | Set when status transitions to completed                                                                  |

### 4.1.5 `skill_points_ledger`

| Column / Field   | Type         | Constraints             | Description                                                                    |
| ---------------- | ------------ | ----------------------- | ------------------------------------------------------------------------------ |
| `id`             | UUID         | PK                      | Ledger entry primary key                                                       |
| `user_id`        | UUID         | FK → users.id, NOT NULL | User whose balance is affected                                                 |
| `transaction_id` | UUID         | FK → transactions.id    | Associated transaction (NULLABLE for admin adjustments)                        |
| `entry_type`     | ENUM         | NOT NULL                | debit \| credit \| escrow_hold \| escrow_release \| admin_adjustment           |
| `amount`         | INTEGER      | NOT NULL                | Positive integer; direction determined by entry_type                           |
| `balance_after`  | INTEGER      | NOT NULL                | Running balance snapshot after this entry — enables audit trail reconstruction |
| `description`    | VARCHAR(255) | NOT NULL                | Human-readable description for user-facing transaction history                 |
| `created_at`     | TIMESTAMPTZ  | DEFAULT NOW()           | Ledger entry creation timestamp; immutable                                     |

The `skill_points_ledger` implements double-entry bookkeeping semantics. Every movement of SkillPoints — whether deduction, credit, escrow hold, or release — is recorded as an immutable ledger entry. The `profiles.skill_points` column is a denormalised running total maintained by a database trigger, ensuring that the balance shown to the user is always consistent with the ledger without requiring a `SUM()` query on every profile load.

### 4.1.6 Additional Tables (Summary)

| Table              | Fields                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ratings`          | post_id, rater_id, ratee_id, rating (1–5), feedback_text, transaction_id (FK), created_at                                                                                |
| `badges`           | id, code, name, description, icon_url, xp_reward, condition_type, condition_value                                                                                        |
| `user_badges`      | user_id (FK), badge_id (FK), awarded_at — composite PK; prevents duplicate awards                                                                                        |
| `notifications`    | id, user_id (FK), type (ENUM), payload (JSONB), is_read, created_at — payload stores dynamic notification data                                                           |
| `conversations`    | id, participant_ids (UUID[]), last_message_at, created_at — array column for 2+ participant support                                                                      |
| `messages`         | id, conversation_id (FK), sender_id (FK), content (TEXT), is_deleted, sent_at — soft-delete for chat history                                                             |
| `documents`        | id, user_id (FK), file_key, file_type, original_name, status (ENUM: pending \| scanning \| pending_review \| approved \| rejected), scan_result, reviewed_by, created_at |
| `community_posts`  | id, author_id (FK), title, body, post_type (request \| offer \| event), skill_category_id, is_active, created_at                                                         |
| `activity_streaks` | user_id (FK PK), current_streak, longest_streak, last_active_date — updated by daily cron job                                                                            |
| `skill_categories` | id, name, parent_id (FK self-referencing), slug, icon, is_active                                                                                                         |
| `admin_logs`       | id, admin_id (FK), action, target_type, target_id, metadata (JSONB), created_at — immutable audit log                                                                    |

## 4.2 Indexing Strategy

| Index                                            | Purpose                                                  |
| ------------------------------------------------ | -------------------------------------------------------- |
| `profiles (user_id)`                             | UNIQUE index — one-to-one enforcement and fast join      |
| `profiles (reputation_score DESC)`               | B-tree index — match ranking and leaderboard queries     |
| `profiles (last_active_at)`                      | B-tree — activity-based filtering and streak calculation |
| `skills (search_vector)`                         | GIN index — full-text search (tsvector)                  |
| `skills (user_id, is_active)`                    | Composite partial index — user's active skill listings   |
| `skills (category_id, is_active)`                | Composite — category browse queries                      |
| `transactions (initiator_id, status)`            | Composite — user transaction history with status filter  |
| `transactions (provider_id, status)`             | Composite — provider's pending/completed jobs            |
| `transactions (confirmation_deadline)`           | B-tree — expiry cron job scan                            |
| `skill_points_ledger (user_id, created_at DESC)` | Composite — paginated transaction history per user       |
| `messages (conversation_id, sent_at)`            | Composite — paginated message retrieval                  |
| `notifications (user_id, is_read)`               | Composite partial — unread notification count badge      |
| `documents (user_id, status)`                    | Composite — user's document status + admin review queue  |
| `user_badges (user_id)`                          | B-tree — profile badge display                           |

## 4.3 Transaction Handling

All financial operations on the SkillPoints ledger are executed within PostgreSQL transactions with the SERIALIZABLE isolation level for the escrow initiation step (to prevent concurrent double-spend) and READ COMMITTED for the less critical confirmation steps. Advisory locks (`pg_advisory_xact_lock(user_id_hash)`) provide application-level serialisation for the critical balance check → deduct sequence, preventing race conditions that database-level isolation alone does not address in all PostgreSQL versions.

# 5. API Design Strategy

## 5.1 REST vs GraphQL

The primary API is designed as a RESTful HTTP API. The decision is made on the following grounds: the platform's data access patterns are well-defined and map cleanly to resource-based endpoints; REST responses are easily cached at the CDN and reverse proxy level (GraphQL POST requests are not cacheable without additional tooling); and REST APIs are simpler to document, test, and secure with standard rate-limiting middleware. GraphQL is not recommended as the primary API style for this project, though it may be introduced in the future for third-party API consumers who require flexible querying.

**API Base URL:** `https://api.talentswap.com/api/v1/` — All endpoints are prefixed with the versioned base path.

## 5.2 API Versioning

The API is versioned via URL path prefix (`/api/v1/`, `/api/v2/`). Header-based versioning (`Accept-Version: 2`) is not recommended as it is invisible in browser history and harder to test. When breaking changes are required, a new version prefix is introduced and the previous version is maintained with a deprecation notice in response headers (`Deprecation: true`, `Sunset: {date}`) for a defined support window before retirement.

## 5.3 Core Endpoint Groups

| Group         | Endpoints                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/verify-email/:token` |
| Users         | `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`, `GET /users/:id/skills`, `GET /users/:id/reviews`, `GET /users/:id/badges`                                            |
| Skills        | `GET /skills` (search + filter), `POST /skills`, `GET /skills/:id`, `PATCH /skills/:id`, `DELETE /skills/:id`                                                                    |
| Matches       | `GET /matches/suggestions` (AI-ranked), `POST /matches/connect/:userId`                                                                                                          |
| Transactions  | `POST /transactions`, `GET /transactions/:id`, `POST /transactions/:id/confirm`, `POST /transactions/:id/dispute`, `GET /transactions/history`                                   |
| Wallet        | `GET /wallet/balance`, `GET /wallet/ledger`                                                                                                      |
| Storage       | `POST /storage/presign`, `POST /storage/confirm`, `DELETE /storage/:key`                                                                                                         |
| Documents     | `GET /documents` (admin), `PATCH /documents/:id/review` (admin)                                                                                                                  |
| Chat          | `GET /conversations`, `POST /conversations`, `GET /conversations/:id/messages`                                                                                                   |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`                                                                                           |
| Ratings       | `POST /ratings`, `GET /ratings/user/:id`                                                                                                                                         |
| Badges        | `GET /badges`, `GET /badges/user/:id`                                                                                                                                            |
| Community     | `GET /community/posts`, `POST /community/posts`, `GET /community/posts/:id`, `DELETE /community/posts/:id`                                                                       |
| Admin         | `GET /admin/users`, `PATCH /admin/users/:id/ban`, `GET /admin/documents/queue`, `GET /admin/transactions/flagged`, `GET /admin/analytics/dashboard`                              |

## 5.4 Rate Limiting Strategy

Rate limiting is applied at two levels: at the Cloudflare edge (network-level, IP-based, protecting against DDoS and credential stuffing) and at the NestJS application layer (per-user and per-IP, protecting against API abuse). The limits vary by endpoint sensitivity:

| Endpoint / Resource                                         | Limit                                      | Purpose                                              |
| ----------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Authentication endpoints (login, register, forgot-password) | 5 requests / 15 minutes per IP             | Prevents credential stuffing and account enumeration |
| Standard API endpoints (authenticated)                      | 200 requests / minute per user             | Prevents programmatic scraping                       |
| File upload presign endpoint                                | 10 requests / minute per user              | Prevents storage abuse                               |
| WebSocket connections                                       | 1 active connection per authenticated user | Additional connections reject with 429               |
| Admin endpoints                                             | 50 requests / minute per admin user        | Higher limit for dashboard operations                |

## 5.5 WebSocket Event Architecture

Socket.io events follow a consistent naming convention of `domain:action` (e.g., `message:send`, `transaction:confirmed`, `notification:new`). Events that mutate state are acknowledged with a callback to confirm server receipt. Events are namespaced to isolate concerns:

| Namespace               | Purpose                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `/` (default namespace) | General notifications, transaction events, badge awards, system announcements                          |
| `/chat`                 | Conversation-specific message events scoped to conversation rooms                                      |
| `/call`                 | WebRTC signalling events: `call:offer`, `call:answer`, `call:ice-candidate`, `call:end`, `call:reject` |
| `/admin`                | Admin-only events: `new_document_for_review`, `transaction_flagged`, `user_reported`                   |

All WebSocket payloads are validated against Zod schemas in the gateway handler before processing, using the same schema definitions as the REST API to ensure consistency. Event payloads exceeding a maximum size threshold (64 KB by default) are rejected to prevent denial-of-service via oversized messages.

# 6. Recommended Folder Structure

## 6.1 Frontend (Next.js App Router)

```text
talentswap-frontend/
├── app/                          # App Router root
│   ├── (public)/                 # Route group — unauthenticated pages
│   │   ├── page.tsx              # Landing page (SSG)
│   │   ├── skills/page.tsx       # Public skill directory (SSR)
│   │   └── users/[id]/page.tsx   # Public profile page (SSR)
│   ├── (auth)/                   # Route group — auth pages (no layout)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Route group — authenticated app shell
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── dashboard/page.tsx    # User home feed
│   │   ├── discover/page.tsx     # AI match suggestions + search
│   │   ├── exchanges/page.tsx    # Transaction history
│   │   ├── wallet/page.tsx       # Points balance + ledger
│   │   ├── messages/             # Chat inbox + conversation thread
│   │   ├── community/page.tsx    # Community board
│   │   ├── profile/              # Own profile management
│   │   └── settings/             # Account settings, notifications
│   ├── (admin)/                  # Route group — admin-only
│   │   ├── admin/layout.tsx
│   │   ├── admin/users/page.tsx
│   │   ├── admin/documents/page.tsx
│   │   └── admin/analytics/page.tsx
│   ├── layout.tsx                # Root layout (fonts, providers)
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── features/                 # Feature-specific component groups
│   │   ├── auth/                 # LoginForm, RegisterWizard
│   │   ├── skills/               # SkillCard, SkillForm, SkillSearch
│   │   ├── transactions/         # TransactionFlow, EscrowStatus, ConfirmModal
│   │   ├── chat/                 # ChatWindow, MessageBubble, TypingIndicator
│   │   ├── calling/              # VideoCallModal, CallControls, CallStatus
│   │   ├── gamification/         # BadgeDisplay, LevelProgress, Leaderboard
│   │   └── notifications/        # NotificationBell, NotificationList
│   └── layouts/                  # Sidebar, Navbar, Footer
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts, useSocket.ts, useWebRTC.ts
│   └── useTransactions.ts, useNotifications.ts
├── lib/                          # Utilities, API client, constants
│   ├── api.ts                    # Configured Axios/fetch wrapper
│   ├── socket.ts                 # Socket.io client singleton
│   ├── validations/              # Shared Zod schemas (mirrored from backend)
│   └── utils.ts                  # Date formatting, point formatting, etc.
├── store/                        # Zustand stores
│   ├── authStore.ts, notificationStore.ts, callStore.ts
├── types/                        # Global TypeScript interfaces and enums
├── public/                       # Static assets, PWA manifest, favicon
└── middleware.ts                 # Next.js middleware for auth-gating routes
```

## 6.2 Backend (NestJS Modular Monolith)

```text
talentswap-backend/
├── src/
│   ├── main.ts                   # Bootstrap: Fastify adapter, validation pipe, Swagger
│   ├── app.module.ts             # Root module — imports all feature modules
│   ├── config/                   # ConfigModule setup; environment schema validation
│   ├── common/                   # Shared across modules
│   │   ├── guards/               # JwtAuthGuard, RolesGuard, OwnershipGuard
│   │   ├── decorators/           # @CurrentUser(), @Roles(), @Public()
│   │   ├── interceptors/         # ResponseTransformInterceptor, LoggingInterceptor
│   │   ├── filters/              # GlobalExceptionFilter (standardised error envelope)
│   │   ├── pipes/                # ZodValidationPipe
│   │   └── utils/                # Crypto helpers, date utils, pagination
│   ├── modules/
│   │   ├── auth/                 # AuthModule: login, register, token refresh, OAuth
│   │   ├── users/                # UserModule: CRUD, profile, role management
│   │   ├── skills/               # SkillModule: listings, search, categories
│   │   ├── transactions/         # TransactionModule: escrow, confirmation, ledger
│   │   ├── wallet/               # WalletModule: balance and ledger history
│   │   ├── matching/             # MatchingModule: AI-powered suggestions endpoint
│   │   ├── chat/                 # ChatModule: conversations, messages, WebSocket gateway
│   │   ├── calling/              # CallingModule: Agora token generation, call records
│   │   ├── notifications/        # NotificationModule: creation, delivery, read state
│   │   ├── storage/              # StorageModule: presign, confirm, delete, ClamAV trigger
│   │   ├── documents/            # DocumentModule: upload tracking, review workflow
│   │   ├── ratings/              # RatingModule: post-exchange rating submission + retrieval
│   │   ├── gamification/         # GamificationModule: XP, badges, levels, leaderboards
│   │   ├── community/            # CommunityModule: board posts, events
│   │   ├── admin/                # AdminModule: user management, moderation, analytics
│   │   └── search/               # SearchModule: unified full-text search across skills/users
│   ├── database/
│   │   ├── prisma.service.ts     # PrismaClient provider with connection management
│   │   └── migrations/            # Prisma migration history
│   ├── queues/                   # BullMQ queue definitions and processor classes
│   │   ├── email.queue.ts
│   │   ├── notification.queue.ts
│   │   ├── document-scan.queue.ts
│   │   └── gamification.queue.ts
│   └── websocket/
│       ├── main.gateway.ts        # Default namespace — notifications, transactions
│       ├── chat.gateway.ts        # /chat namespace
│       └── call.gateway.ts        # /call namespace — WebRTC signalling
├── test/                         # e2e tests (Jest + Supertest)
├── prisma/                       # schema.prisma, seed.ts
├── Dockerfile                    # Multi-stage production build
├── docker-compose.yml            # Local dev: postgres, redis, mailhog
└── .env.example                  # Environment variable template
```

# 7. Third-Party Services and Integrations

| Category               | Service / Technology                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication         | Passport.js (Google OAuth, LinkedIn OAuth) — self-managed tokens; optional upgrade to Clerk for complete managed auth-as-a-service including MFA, session management, and user dashboards |
| Cloud Storage          | Cloudflare R2 (primary — zero egress fees, S3-compatible); AWS S3 (alternative if AWS infrastructure already in place)                                                                    |
| CDN                    | Cloudflare (edge caching, WAF, DDoS protection, TLS) — integrated with R2 at no additional configuration cost                                                                             |
| Voice / Video Calling  | Agora.io SDK (managed WebRTC; token-based room access; recording optional); alternatives: Daily.co (simpler SDK), Twilio Video, Jitsi Meet (self-hosted, free)                            |
| Email Delivery         | Resend (modern API, excellent deliverability, React Email template support); alternative: SendGrid (higher volume, established deliverability)                                            |
| Push Notifications     | Web Push API (browser-native, no third-party); backed by VAPID key pairs hosted on the backend; OneSignal as managed alternative                                                          |
| Antivirus Scanning     | ClamAV (open-source, self-hosted daemon scanning uploaded files); commercial alternative: VirusTotal API (for low-volume MVP)                                                             |
| Document Analysis      | AWS Textract or Google Document AI (OCR and field extraction for uploaded certificates); active only post-MVP                                                                             |
| Error Tracking         | Sentry (full-stack: Next.js client errors + NestJS server errors; performance monitoring; session replay on frontend)                                                                     |
| Application Monitoring | Grafana + Prometheus (self-hosted on a small VPS); managed alternative: Datadog (higher cost, superior out-of-box dashboards)                                                             |
| Log Aggregation        | Grafana Loki (self-hosted, cost-effective); AWS CloudWatch Logs (if AWS-hosted); Logtail (managed, developer-friendly)                                                                    |
| Analytics              | PostHog (self-hostable product analytics; funnels, session replay, feature flags; GDPR-compliant); alternative: Mixpanel                                                                  |
| Uptime Monitoring      | BetterUptime or UptimeRobot — HTTP health check probes with on-call alerting; PagerDuty integration for production incidents                                                              |
| AI / Embeddings        | OpenAI text-embedding-3-small model for skill semantic similarity matching; stored as pgvector (PostgreSQL extension) for efficient vector similarity queries                             |
| Payment Processing     | No payment processor: SkillPoints cannot be purchased with real currency                                                                       |
| Rate Limiting (Edge)   | Cloudflare Rate Limiting rules — applied before traffic reaches the origin server, protecting against volumetric attacks and credential stuffing                                          |

# 8. Security and Privacy Considerations

## 8.1 Protection Against Points Fraud

The SkillPoints economy is a primary attack surface. The following mechanisms in combination address all known fraud vectors:

- **Double-entry ledger:** Every SkillPoints movement generates two immutable ledger entries (debit + credit), making it mathematically impossible for points to be created or destroyed without a corresponding record. Any discrepancy between the ledger sum and the wallet balance triggers an automated alert.
- **Pre-deduction escrow:** Points are deducted before a session begins, eliminating the attack where a user receives a service then claims inability to pay. The recipient cannot receive the service without the points first being held.
- **Idempotency keys:** All transaction creation requests must include a client-generated UUID idempotency key. The server rejects duplicate keys with a 409 Conflict response, preventing double-submission from network retries or UI bugs.
- **Advisory locks:** `pg_advisory_xact_lock()` serialises concurrent balance-read-then-deduct operations for the same user, preventing race conditions where two simultaneous transactions could each read the same pre-deduction balance and both succeed against an insufficient balance.
- **Velocity anomaly detection:** A BullMQ job runs hourly to flag accounts accumulating points at an abnormal rate (e.g., more than 5x the platform average) and places them in a manual review queue.

## 8.2 Authentication and Session Security

- **RS256 asymmetric JWT signing:** Access tokens are signed with a private RSA key (stored in a secrets manager) and verified with the public key. This means the public key can be distributed to multiple services without exposing the signing authority.
- **httpOnly Secure cookies for refresh tokens:** Refresh tokens are never accessible to JavaScript, completely eliminating XSS-based token theft from client-side code.
- **Refresh token rotation with family tracking:** Each refresh generates a new token and invalidates the previous. If a previously used token is presented (indicating theft and replay), the entire token family is invalidated and the user is forced to re-authenticate.
- **Account lockout:** After 5 consecutive failed login attempts, the account is temporarily locked for 15 minutes, and an email alert is sent to the registered address.
- **2FA (TOTP):** Available as an optional security upgrade for all users and mandatory for admin and moderator accounts. Implemented via the speakeasy library with QR code provisioning.

## 8.3 Privacy Protection and Secure Communication

- **No contact detail exchange required:** In-app voice and video calling ensures that users never need to share phone numbers, email addresses, or social media profiles to collaborate. Personal contact sharing is explicitly discouraged in the platform's community guidelines.
- **WebRTC SRTP/DTLS encryption:** All media streams in voice and video calls are encrypted at the transport layer. When using Agora's managed infrastructure, calls are further protected by Agora's AES-128 channel encryption.
- **Chat message encryption:** Messages are encrypted at rest in the database using column-level encryption for sensitive content. In transit, all API and WebSocket traffic is protected by TLS 1.3.
- **Data minimisation:** User location data is stored at city/region granularity only — no precise GPS coordinates are collected or stored. Profile data accessible to other users is limited to explicitly chosen public fields.
- **GDPR compliance mechanisms:** Data export endpoint (`GET /users/:id/data-export`) returns all stored user data in machine-readable JSON. Account deletion (`DELETE /users/:id`) triggers a cascade that anonymises rather than hard-deletes records where ledger integrity requires the user reference to be maintained.
- **Audit logging:** All administrative actions on user accounts (bans, document approvals, point adjustments) are logged to the `admin_logs` table with the acting admin's ID, timestamp, and action parameters — providing a tamper-evident audit trail.

## 8.4 File Upload and Document Verification Safety

- **Presigned URL upload:** Files are never transmitted through the application server. Server-side memory exhaustion from file upload streams is therefore impossible.
- **MIME type and magic byte validation:** The backend validates both the declared Content-Type header and the actual file magic bytes (using the file-type library) to prevent MIME type spoofing (e.g., uploading an executable with a .pdf extension).
- **File size limits:** Enforced at the Cloudflare CDN layer (before the presign request is even processed) and re-validated in the presign endpoint. Profile images: 5 MB. Documents: 20 MB. Chat attachments: 10 MB.
- **ClamAV antivirus scanning:** Every uploaded file is scanned asynchronously post-upload. If a threat is detected, the file is quarantined (bucket moved to a separate quarantine prefix), the document status is set to REJECTED, the user is notified, and the security team receives an alert.
- **Document storage isolation:** Credential documents are stored in a private bucket prefix accessible only via backend-generated time-limited signed download URLs. They are never publicly accessible via a direct URL.

## 8.5 API and Infrastructure Security

- **OWASP Top 10 mitigations:** SQL injection (Prisma parameterised queries), XSS (DOMPurify on client, sanitize-html on server), CSRF (SameSite=Strict cookies + CSRF tokens for state-mutating requests), broken access control (ownership guards on every resource endpoint), security misconfiguration (Helmet.js headers, no stack traces in production errors).
- **DDoS protection:** Cloudflare's L3/L4/L7 DDoS mitigation sits in front of all traffic. The origin server IP is concealed behind Cloudflare's proxy, making direct-to-origin attacks impractical.
- **Secret management:** All secrets (database URLs, JWT signing keys, API keys, storage credentials) are stored in a secrets manager (Railway Secrets / AWS Secrets Manager / Doppler) and injected as environment variables at runtime. Secrets are never committed to version control.
- **Container security:** Docker images are scanned for known CVEs on every CI build using Trivy. Images run as non-root users inside containers. The container runtime has no access to the host network beyond the required exposed port.

# 9. Development Roadmap

## Phase 1 — Minimum Viable Product (Months 1–3)

_Goal: A functional, deployable platform that demonstrates the core value proposition and validates user interest with minimal infrastructure complexity._

- User registration, email verification, password reset, and JWT-based authentication.
- Profile creation and management: display name, bio, location, avatar upload (R2 storage).
- Skill listing CRUD: create offering/seeking listings with category, proficiency, and point rate.
- Basic SkillPoints wallet: opening balance grant on registration, manual balance view.
- Simple text-based community board for skill requests and offers.
- Basic search and filtering of skill listings (PostgreSQL full-text search).
- Simple transaction flow: initiate, escrow hold, dual-confirmation, points distribution.
- Post-exchange rating and written feedback submission.
- In-app text messaging (Socket.io chat, no file attachments).
- Transactional email: registration, verification, transaction confirmation (Resend).
- Basic admin dashboard: user list, ban/unban, transaction overview.
- Deployment: Vercel (frontend), Railway (backend + PostgreSQL + Redis).
- CI/CD: GitHub Actions (lint, test, deploy on merge to main).

## Phase 2 — Intermediate (Months 4–6)

_Goal: Deepen engagement, build trust infrastructure, and introduce differentiating features that extend user retention beyond the first exchange._

- Document and certificate upload system with ClamAV scanning and admin review queue.
- Verified badge issuance by moderators; Verified filter in search results.
- Gamification engine: XP system, experience levels, achievement badges, activity streaks.
- Leaderboard by skill category (Redis sorted sets, updated via BullMQ jobs).
- In-app voice and video calling via WebRTC with Agora SDK integration.
- Notification system: in-app (WebSocket) and browser push (Web Push API / VAPID).
- Advanced search: skill category filters, location radius, reputation score, verified-only toggle.
- AI-powered match suggestions: OpenAI embeddings stored in pgvector for semantic similarity ranking.
- Chat media attachments: images and documents with R2 storage and presigned URLs.
- Dispute resolution flow: structured escalation from self-resolution to moderator arbitration.
- Deployment: Migrate backend from Railway to AWS ECS Fargate (or Fly.io) for better horizontal scaling; introduce PgBouncer connection pooling.
- Monitoring: Sentry (both tiers), Grafana + Prometheus dashboard, Loki log aggregation.

## Phase 3 — Advanced (Months 7–12)

_Goal: Production-hardening, administrative maturity, and feature parity with a commercially competitive platform._

- Real-money SkillPoints purchases are explicitly out of scope and must not be implemented.
- Fraud detection: ML-based anomaly detection for unusual point accumulation, session inflation, and account takeover patterns. Automated flagging with admin review queue.
- Content moderation: profanity filtering and image content moderation for chat messages and community posts (via OpenAI moderation API or AWS Rekognition).
- Advanced admin dashboard: platform analytics (DAU, MAU, exchange volume, category trends), cohort analysis, moderation queue metrics.
- Group skill sessions: one provider, multiple recipients, proportional point distribution.
- Skill certification partnerships: API integration with credential issuing bodies for automated verification.
- Organisation accounts: institutional profiles with team exchange management.
- PWA enhancements: service worker, offline asset caching, install prompt for mobile browser users.
- Calendar integration: Google Calendar / Outlook session scheduling sync.
- Architecture: Extract Notification Service and Transaction Service as independently deployable microservices; introduce a message broker (RabbitMQ or AWS SQS) for inter-service communication.

## Phase 4 — Scaling Stage (Year 2+)

_Goal: Infrastructure and architecture capable of serving 100,000+ users globally with high availability, low latency, and operational resilience._

- Multi-region PostgreSQL deployment: primary in primary region with read replicas in secondary regions (e.g., US-East, EU-West, APAC); read queries routed to nearest replica via read-routing middleware.
- Elasticsearch / OpenSearch: replace PostgreSQL full-text search for skill and user discovery at scale; real-time index sync via BullMQ CDC (change data capture) jobs.
- API Gateway: introduce Kong or AWS API Gateway for centralised rate limiting, authentication, routing, and observability across microservices.
- TalentSwap Open API: public developer API enabling third-party integration with HR platforms, educational institutions, and local government community tools.
- Decentralised governance tools: community voting dashboard allowing high-reputation users to participate in platform policy decisions.
- Advanced WebRTC: self-hosted Selective Forwarding Unit (SFU) via mediasoup for multi-party group video calls, reducing Agora costs at high call volumes.
- A/B testing infrastructure: PostHog feature flags for controlled feature rollouts with statistical significance tracking.
- SLA target: 99.9% uptime (< 9 hours downtime per year); enforced by multi-AZ deployment, automated failover, and blue-green deployment strategy.

# 10. Final Recommendation

## 10.1 Recommended Production Stack Summary

| Layer               | Chosen Technology                                        |
| ------------------- | -------------------------------------------------------- |
| Frontend Framework  | Next.js 14 (React, App Router, TypeScript)               |
| State Management    | Zustand (UI state) + TanStack Query (server state)       |
| Styling             | Tailwind CSS + shadcn/ui (Radix primitives)              |
| Form Handling       | React Hook Form + Zod (shared schemas)                   |
| Backend Runtime     | Node.js 20 LTS                                           |
| Backend Framework   | NestJS (modular, TypeScript-first, DI)                   |
| API Style           | REST /api/v1/ + Socket.io WebSocket gateway              |
| Authentication      | JWT (RS256) + Refresh Token Rotation + Passport.js OAuth |
| Primary Database    | PostgreSQL 16 (ACID, relational, full-text search)       |
| ORM                 | Prisma (type-safe, schema-first, migrations)             |
| Cache / Queue       | Redis 7 (cache + Socket.io adapter + BullMQ queues)      |
| Search              | PostgreSQL tsvector (MVP) → Elasticsearch (scale)        |
| Object Storage      | Cloudflare R2 (zero egress, S3-compatible)               |
| CDN / Security Edge | Cloudflare (CDN + WAF + DDoS + TLS)                      |
| Video / Voice       | WebRTC + Agora.io SDK (managed TURN/STUN)                |
| Real-Time Messaging | Socket.io with Redis adapter (multi-instance)            |
| Background Jobs     | BullMQ (Redis-backed; retry, delay, priority queues)     |
| Email               | Resend (transactional) + React Email (templates)         |
| File Safety         | ClamAV antivirus + MIME/magic byte validation            |
| Error Monitoring    | Sentry (full-stack)                                      |
| Infra Monitoring    | Prometheus + Grafana                                     |
| Frontend Deployment | Vercel                                                   |
| Backend Deployment  | Railway (MVP) → AWS ECS Fargate (scale)                  |
| Database Hosting    | Supabase managed PostgreSQL (MVP) → AWS RDS (scale)      |
| CI/CD               | GitHub Actions (lint, test, migrate, deploy)             |
| Containerisation    | Docker (multi-stage builds) + Docker Compose (local dev) |
| Secret Management   | Railway Secrets / AWS Secrets Manager / Doppler          |

## 10.2 Why This Stack Is Optimal for TalentSwap

Every technology choice in this specification was made by applying the same three-part test: does it solve TalentSwap's specific technical requirements, does it allow the team to move fast in the early stages without accumulating architectural debt, and does it have a clear upgrade path as the platform scales to tens of thousands of users?

Next.js with TypeScript satisfies the frontend requirements completely: SSR for SEO on public skill and profile pages, CSR for the interactive authenticated dashboard, and a shared language with the backend that enables schema reuse and eliminates an entire class of type mismatch bugs. NestJS provides the architectural discipline that a platform of this complexity demands — its module system enforces domain boundaries that make the codebase maintainable as the team grows, and its native support for WebSocket gateways, background queues, and dependency injection removes the need for significant custom infrastructure.

PostgreSQL is the non-negotiable choice for the financial-grade points ledger. No NoSQL database provides the ACID transaction guarantees and row-level locking semantics required to implement a double-entry accounting system safely. Redis complements PostgreSQL perfectly as a volatile, high-speed layer for caching, queue management, and WebSocket state — roles where Redis's in-memory performance is decisive and PostgreSQL's durability guarantees are unnecessary.

Cloudflare R2 and CDN reduce infrastructure costs significantly compared to AWS S3 + CloudFront by eliminating egress fees, which become material at scale when users frequently download credential documents and skill portfolio assets. The WebRTC + Agora combination delivers the in-app calling requirement without requiring TalentSwap to operate any media server infrastructure in the MVP stage, reserving the option to self-host a Selective Forwarding Unit (mediasoup) when per-minute Agora costs become the dominant infrastructure expenditure.

## 10.3 Future Scalability and Industry Relevance

Every component of this stack is either already operating at massive scale in production at leading technology companies, or is a recognised best practice for the category of problem it addresses. React and Next.js power a significant portion of the world's highest-traffic web applications. PostgreSQL is the database of choice for financial applications, healthcare platforms, and large-scale SaaS products. Redis is deployed at companies processing billions of requests per day. NestJS is adopted by enterprise engineering teams precisely because its architecture scales gracefully from a two-person startup to a hundred-person engineering organisation without requiring a rewrite.

The architecture as specified will comfortably serve TalentSwap's first 50,000 users without requiring structural change. The modular monolith can absorb increasing load through horizontal scaling (multiple NestJS instances behind Nginx) and read replica promotion (PostgreSQL read replicas for SELECT-heavy analytics and search queries) before microservice extraction becomes necessary. When it does become necessary, the NestJS module boundaries and BullMQ queue separation points provide natural extraction seams that minimise the disruption of that transition.

In conclusion, this specification delivers a technology foundation that is production-ready from day one, commercially credible to technical investors and engineering recruits, and architecturally sound for a journey from zero to a globally distributed, community-owned skill exchange platform.

_— End of Technology Specification Document —_

---

_Confidential | TalentSwap Technical Architecture | Page of_
