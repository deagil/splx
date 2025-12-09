# Splx Studio

Splx Studio is a multi-tenant workspace for building data-driven pages and collaborating with AI. It pairs a visual page builder, dynamic tables, and contextual AI chat so teams can design views, act on data, and talk to their content in one place.

## What's inside

- Visual page builder with grid-based layout, templates, and reusable blocks (List, Record, Trigger; Report planned)
- AI chat with streaming responses, @mentions for pages/blocks/tables/records, file uploads, and multiple model providers (OpenAI, xAI via gateway)
- Data tables with creation wizard, metadata sync from Postgres, and configuration views for labels and field display
- Workspace settings for profile, members/roles, collaboration/gov guidance, and connected apps (Postgres + AI providers)
- Local vs hosted modes with clear main DB vs resource store separation

## Feature tour

### Visual page builder
- Compose pages on a 12-column grid; duplicate, position, and remove blocks with inline settings.
- Blocks:
  - **List**: Bind to tables, filter (including URL params), search, paginate, toggle row actions, inline editing, column visibility/pinning/resizing, and page size defaults.
  - **Record**: Read/edit/create modes, URL-bound record IDs, configurable field layouts.
  - **Trigger**: Action buttons that call APIs/workflows with confirmation dialogs and feedback.
  - **Report**: Charting block planned.
- Start from list/detail templates, autosave edits, and toggle read/edit modes.
- Blocks register their data with the mention context so AI chat can reference page content.

### Data tables
- Create tables from `/app/build/data/create`, then configure columns, labels, and descriptions in the table config routes.
- Browse database tables in `/app/data/tables`, view configured metadata, and sync definitions from Postgres when schemas change.

### AI chat with context
- Plate-based chat input with streaming responses, @mentions for pages/blocks/tables/records, and file/image attachments.
- Multiple models with personalization and usage tracking; reasoning view available for reasoning-capable models.

### Integrations and workspace settings
- Workspace settings cover profile, members/roles, collaboration and governance guidance, plus a connected apps area.
- Connected apps manage Postgres connections (written to `.env.local` in local mode, stored per-workspace in hosted mode) and AI provider credentials (OpenAI/xAI via gateway).
- User preferences and profile pages let individuals tune their experience.

### Modes and data separation
- `APP_MODE=local`: main DB and resource store are the same database.
- `APP_MODE=hosted`: system tables live in the main DB; tenant data (tables, pages, chats, documents, messages, etc.) lives in each workspace’s resource store.

## Running locally

Prerequisites: Node.js 18+, pnpm (see `packageManager` for the expected version).

1) Create `.env.local` with required values:
```
APP_MODE=local
NEXT_PUBLIC_APP_MODE=local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
POSTGRES_URL=...
OPENAI_API_KEY=...
XAI_API_KEY=...          # optional, for xAI models
AI_GATEWAY_API_KEY=...   # optional, if using AI Gateway outside Vercel
```
2) Install dependencies:
```
pnpm install
```
3) Start the dev server (Turbopack):
```
pnpm dev
```
4) Open http://localhost:3000 to sign in, create tables, and start building pages.

## Common commands
- `pnpm dev` – run the app locally
- `pnpm type-check` – TypeScript project check
- `pnpm lint` / `pnpm format` – linting and formatting (Ultracite/Biome)
- `pnpm build` – production build
- `pnpm test` – run tests (Playwright/Jest where configured)

## Documentation
- `docs/PAGES_SYSTEM.md` – visual page builder and block types
- `docs/AI_CHAT_SYSTEM.md` – chat, mentions, and streaming flow
- `docs/DATABASE_ARCHITECTURE.md` – main DB vs resource store
- `docs/INTEGRATION_CARDS.md` – integration UI guidelines
- `docs/ONBOARDING_OTP.md` – authentication and onboarding flow
- `docs/pages-migration.md` – page migration notes
