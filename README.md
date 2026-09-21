# onyx.

> A lightweight internal request and work tracking platform designed to replace fragmented communication with an accountable, structured workflow.

---

## Overview

**onyx** is an intentionally lean ticketing and request-management system. It replaces unstructured task requests scattered across chat apps, phone calls, and verbal exchanges with a single, clear operating cycle:

$$\text{Request} \longrightarrow \text{Track} \longrightarrow \text{Execute} \longrightarrow \text{Document} \longrightarrow \text{Close}$$

The system is purposely built to avoid the bureaucracy and complexity of enterprise ITSM platforms. It delivers an intuitive, messaging-like interface for non-technical team members while providing administrators with a focused command center and an immutable audit trail.

---

## Core Capabilities

- **Human-Friendly 30-Second Request Flow**: Requester forms require only a title, description, and optional attachments. Jargon-free and straightforward for all team members.
- **Account-Based Accountability**: Individual user identities ensure every work item has a clear requester, owner, timestamp, and audit trail.
- **Deterministic Lifecycle State Machine**:
  - `OPEN` — Request acknowledged and queued.
  - `IN_PROGRESS` — Work is actively being executed.
  - `WAITING` — Work is blocked by an explicit external reason or missing information. Automatically resumes to `IN_PROGRESS` when the requester provides feedback or files.
  - `COMPLETED` — Work delivered with documented proof (summary, live URL, and evidence attachments).
  - `CLOSED` — Finished and confirmed.
  - `CANCELLED` — Request will not be executed, accompanied by a cancellation reason.
  - `REOPENED` — Completed tickets can be reopened if further action is required.
- **First-Class Completion Proof**: Delivery is recorded with written descriptions, links, and screenshots, building permanent documentation of delivered value.
- **Chronological Activity Feed & Confidential Notes**:
  - Transparent timeline of comments and status events.
  - Role-protected internal notes visible only to administrators.
- **Immutable Event Log**: Audit trail recording actor, event type, prior value, and new value for every state transition.
- **Integration Engine & Webhooks**:
  - Signed outbound webhooks (`HMAC-SHA256`) with event IDs and timestamps for replay attack prevention.
  - Scoped machine tool API with Bearer token authentication for automation agents and external orchestration systems.
- **2026 Dark UI Design Language**:
  - Deep obsidian dark palette (`#06090e`).
  - High-legibility typography and generous spacing.
  - Specular frosted glass surfaces with clear, distinct status badges.

---

## User Roles & Permissions

| Role | Description & Permissions |
|---|---|
| **USER** | Standard team member. Can create tickets, view/comment on own requests, upload files, confirm completion, or reopen recently delivered work. |
| **MANAGER** | Patron (Bölüm / Şirket Yetkilisi). Can view, track, and comment across organization tickets and create requests on behalf of team members. |
| **ADMIN** | Full operational control. Can assign work, change priorities and statuses, record completion proof, manage users and integrations, and view analytics. |
| **SERVICE** | Machine accounts with scoped API tokens for automated agents and orchestration pipelines. |

---

## Tech Stack

- **Frontend / Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & ORM**: SQLite via [Prisma ORM](https://www.prisma.io/) (100% schema-compatible with PostgreSQL)
- **Authentication**: Secure `HttpOnly`, `SameSite=Lax` cookie sessions with bcrypt password hashing
- **Icons**: [Lucide React](https://lucide.dev/)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- `npm` or `pnpm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/spedatox/onyx.git
   cd onyx
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   DATABASE_URL="file:./dev.db"
   ONYX_SESSION_SECRET="your-secure-session-secret"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Initialize database schema and seed demo data**:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build

To compile an optimized production build:

```bash
npm run build
npm run start
```

---

## Integration API

The system provides controlled API endpoints for external tools and agents under `/api/v1/speda`:

- **Authentication**: `Authorization: Bearer <service_token>`
- **Endpoints**:
  - `GET /api/v1/speda` — Query and list tickets with status filters.
  - `POST /api/v1/speda` — Execute actions (`update_status`, `add_comment`, `complete_ticket`).

### Webhook Signatures

Outbound webhook payloads include cryptographic signature headers:

- `X-ONYX-Event`: The event type (e.g. `ticket.created`, `ticket.completed`)
- `X-ONYX-Event-ID`: Unique UUID for the event
- `X-ONYX-Timestamp`: Unix timestamp
- `X-ONYX-Signature`: `HMAC_SHA256(webhook_secret, raw_payload)`

---

## License

This project is licensed under the terms of the repository license.
