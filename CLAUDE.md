# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Splx Studio** is a multi-tenant SaaS platform providing AI-enhanced data management, custom page building, and team collaboration. Built with Next.js 16 (App Router) and Supabase, it features a visual page builder with reusable blocks, role-based permissions, and AI-assisted chat with contextual data mentions.

### Core Concepts

- **Multi-tenant Architecture**: Workspaces with user management and RBAC
- **Dual Database Mode**: Local mode (single Supabase DB) vs Hosted mode (separate tenant databases)
- **Visual Page Builder**: Drag-and-drop interface with List, Record, Report, and Trigger blocks
- **AI Chat with Mentions**: @ mention system to reference page data, tables, records, and users in AI conversations
- **Dynamic Table Management**: Create and manage tables with JSONB schemas

## Feature Documentation

For comprehensive documentation on major features, see:

- **[AI_CHAT_SYSTEM.md](./docs/AI_CHAT_SYSTEM.md)** - Complete guide to the AI chat system including mentions, streaming, personalization, and server-side processing
- **[PAGES_SYSTEM.md](./docs/PAGES_SYSTEM.md)** - Visual page builder with blocks, URL parameters, filtering, and dynamic data binding
- **[ONBOARDING_OTP.md](./docs/ONBOARDING_OTP.md)** - User authentication, OTP verification, and multi-step onboarding flow
- **[AI_CHAT_MENTIONS.md](./docs/AI_CHAT_MENTIONS.md)** - Detailed mention system architecture and implementation
- **[DATABASE_ARCHITECTURE.md](./docs/DATABASE_ARCHITECTURE.md)** - Database structure, multi-tenancy, and data access patterns

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm type-check         # Run once
pnpm type-check:watch   # Watch mode

# Linting and formatting (using Ultracite/Biome)
pnpm check              # Type check + lint
pnpm lint               # Lint only
pnpm format             # Auto-fix formatting issues

# Database operations
pnpm db:migrate         # Apply pending Supabase migrations
pnpm db:reset           # Reset database and reapply all migrations
pnpm db:generate        # Generate Drizzle migrations (reference only)
pnpm db:push            # Push schema via Drizzle (dev only)
pnpm db:pull            # Pull schema from database
pnpm db:studio          # Open Drizzle Studio GUI
pnpm db:check           # Check migration issues

# Workspace provisioning
pnpm provision:workspace    # Bootstrap workspace with owner membership and default connection

# Testing
pnpm test               # Run Playwright tests
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 16 App Router with React 19
- **Database**: Drizzle ORM with Postgres (via Supabase)
- **Authentication**: Supabase Auth with custom middleware
- **AI**: Vercel AI SDK with OpenAI and xAI models
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **UI Components**: Radix UI primitives for accessibility
- **Rich Text**: Plate.js (ProseMirror-based) for chat input with mentions
- **Forms**: React Hook Form with Zod validation
- **Data Grid**: react-data-grid for table views
- **Linting**: Ultracite (Biome wrapper) for fast, strict linting

### Authentication & Multi-tenancy

**Supabase Auth** handles user authentication with custom session management:

- `lib/supabase/server.ts` - SSR Supabase client (`createClient()`, `getAuthenticatedUser()`)
- `lib/supabase/client.ts` - Browser Supabase client
- `proxy.ts` - Next.js middleware for Supabase session handling and onboarding checks
- Authentication routes: `/signin`, `/otp`, `/onboarding`

**Multi-tenancy**:
- `workspaces` table - Each workspace has an `owner_user_id` and `mode` (local or hosted)
- `workspace_users` - Junction table for workspace membership with roles
- `workspace_invites` - Secure invitations with role grants
- `workspace_apps` - External database connection configurations

### Database Architecture: Main DB vs Resource Store

The application uses a **dual database architecture** depending on workspace mode:

**LOCAL MODE** (default for development):
- Single Supabase database contains both system tables AND user data
- System tables: `users`, `workspaces`, `workspace_users`, `roles`, `teams`, `workspace_apps`, `workspace_invites`
- Application tables: `chats`, `messages`, `documents`, `suggestions`, `votes`, `streams`, `pages`, `ai_skills`
- User tables: Any tables created by users (filtered by exclusion from system table list)

**HOSTED MODE** (multi-tenant production):
- **Main DB** (`POSTGRES_URL`): Contains system/config tables only
- **Resource Store** (tenant database): Contains application data and user tables
  - Configured per workspace via `workspace_apps` table
  - Each tenant has their own isolated database

**Key Implementation Files**:
- `lib/db/schema.ts` - Drizzle schema definitions (snake_case naming)
- `app/(app)/api/tables/route.ts` - Mode-aware table listing (handles `?type=config` vs `?type=data`)
- See `docs/DATABASE_ARCHITECTURE.md` for comprehensive details

### Role-Based Access Control (RBAC)

Multi-level permission system managed via database:

- `roles` table - Role definitions per workspace
- `workspace_users` table - Links users to workspaces with roles
- Role hierarchy enforced via `level` field (higher level = more permissions)

**Common Permissions** (enforced in API routes):
- `pages.view`, `pages.edit` - Page access
- `tables.view`, `tables.edit` - Table management
- `data.read`, `data.write` - Data operations
- `workspace.admin` - Workspace settings

### Route Structure

**Public Routes**:
- `/signin` - Authentication page
- `/otp` - OTP verification
- `/onboarding` - User onboarding flow

**App Routes** (`/app/*`):
All routes under `/app` require authentication and workspace membership:

- `/app` - Dashboard (workspace overview)
- `/app/pages` - Page list
- `/app/pages/[pageId]` - View page (supports `?viewMode=edit` for builder)
- `/app/views/[pageId]` - Alias for pages (legacy support)
- `/app/build/data` - Table browser
- `/app/build/data/create` - Create new table
- `/app/build/data/[tableName]/config` - Configure table
- `/app/build/config` - System configuration tables
- `/app/profile` - User profile settings
- `/app/workspace-settings` - Workspace settings
- `/app/preferences` - User preferences

**Legacy Chat Routes** (`/chat/*`):
- `/chat/[id]` - Legacy chat interface (being replaced by AI chat mentions)

**API Routes** (`/api/*`):
- `/api/pages` - Page CRUD operations
- `/api/pages/[pageId]` - Get/update specific page
- `/api/pages/[pageId]/save` - Save page configuration
- `/api/tables` - List tables (supports `?type=config|data`)
- `/api/tables/[tableId]` - Table operations
- `/api/data/[tableName]` - Table data CRUD
- `/api/supabase/table` - Fetch table data with filtering
- `/api/supabase/record` - Fetch single record
- `/api/ai/generate-table-fields` - AI-powered field generation
- `/api/user/skills` - User AI skills management
- `/api/workspace/check-slug` - Workspace slug validation

**Legacy API Routes**:
- `/api/chat/[id]/messages` - Legacy chat messages
- `/api/history` - Chat history

### Visual Page Builder System

**Architecture**:
- Pages are stored in `pages` table with JSONB `blocks`, `settings`, and `layout` fields
- Four block types: List (table data), Record (single record), Report (charts), Trigger (action buttons)
- URL parameter resolution for dynamic filtering and data binding

**Block Types**:
- **List Block** - Displays paginated table data with filtering and search
- **Record Block** - Shows single record in read/edit/create modes
- **Report Block** - Displays charts from saved SQL queries [planned]
- **Trigger Block** - Action buttons with confirmation dialogs

**Key Features**:
- **Templates**: Pre-built page patterns (Detail, List, Dashboard, Form)
- **URL Parameters**: Define required params in `settings.urlParams`, reference via `url.paramName` in block configs
- **Dynamic Filtering**: Filter operators (equals, contains, greater_than, less_than, etc.) with URL param support
- **Visual Builder**: Drag-and-drop interface at `/app/pages/[pageId]?viewMode=edit`

**Key Files**:
- `app/(app)/pages/[pageId]/page.tsx` - Page viewer and builder entry point
- `components/pages/page-renderer.tsx` - Renders page blocks from config
- `components/pages/block-renderer.tsx` - Individual block rendering
- `components/pages/blocks/*.tsx` - Block components (list-block, record-block, etc.)

### AI Chat with Mentions System

**Overview**:
Users can reference contextual data in AI chat using `@` mentions. Mentions appear as visual chips in the UI but are converted to structured text context on the server before sending to AI models.

**Mention Types**:
- `@page` - Reference all data from the current page
- `@block` - Reference specific block data
- `@table` - Lookup data from tables
- `@record` - Reference specific records
- `@user` - Reference user profile data

**Architecture**:
```
User types @ → Plate editor shows mention dropdown → User selects mention →
Mention chip appears → Message sent with mentions array →
Server enriches mentions with data → AI receives enriched message
```

**Key Files**:
- `components/input/multimodal-input.tsx` - Main chat input component
- `components/input/plate-chat-input.tsx` - Plate editor with mention support
- `components/pages/mention-context.tsx` - Collects mentionable data from page blocks
- `components/input/mention-input-element.tsx` - Mention chip rendering
- `lib/server/mentions/enrich.ts` - Server-side mention data enrichment
- `lib/types/mentions.ts` - Mention type definitions
- `hooks/use-mentionable-items.ts` - Hook for managing mentionable items
- See `docs/AI_CHAT_MENTIONS.md` for comprehensive documentation

**Implementation Details**:
- Uses `@platejs/mention` plugin for mention UI
- Mentions stored in message `custom` field as array of mention objects
- Server extracts mention IDs and fetches actual data before sending to AI
- Enriched data formatted as markdown context appended to user message

### AI Integration

**Model Configuration** (`lib/ai/models.ts`):

Client-side model selection:
- `chat-model` - Fast, efficient responses (default)
- `chat-model-reasoning` - Thorough reasoning, takes longer

**AI Providers** (`lib/ai/providers.ts`):
- OpenAI integration via Vercel AI SDK
- xAI integration (Grok models)
- Configurable via AI Gateway

**AI Features**:
- Chat interface with streaming responses
- AI skills system for custom prompts
- Token usage tracking and limits
- Model-specific entitlements per user

**Key Files**:
- `lib/ai/models.ts` - Client-side model definitions
- `lib/ai/providers.ts` - AI provider configurations
- `lib/ai/prompts.ts` - System prompts and AI context
- `lib/ai/entitlements.ts` - User entitlements for AI features
- `app/(legacy-chat)/api/chat/route.ts` - Chat streaming endpoint
- `app/(legacy-chat)/api/chat/[id]/messages/route.ts` - Message history

### Dynamic Table Management

Tables are defined in the `tables` table with JSONB schemas. Each table definition includes:
- Column definitions (name, type, nullable, default)
- Relationships and foreign keys
- Display settings
- Permissions

**Table Operations**:
```typescript
// List tables (mode-aware)
GET /api/tables?type=data          // User data tables only
GET /api/tables?type=config        // System/config tables only

// Create table
POST /api/tables
{ name: "contacts", fields: [...] }

// Get table data with filtering
POST /api/supabase/table
{ table: "contacts", filters: [...], page: 1, limit: 50 }

// Get single record
POST /api/supabase/record
{ table: "contacts", id: "123" }
```

**Reserved Table Names** (LOCAL mode only):
In local mode, users cannot create tables with system table names. The system maintains a `SYSTEM_TABLES` constant for filtering. In hosted mode, no restrictions since tenant tables live in separate databases.

### UI Component System

**Component Library**:
- **shadcn/ui** - React component library based on Radix UI
- **Radix UI** - Unstyled, accessible component primitives
- **Tailwind CSS v4** - Utility-first styling
- **Lucide React** - Icon library
- **Framer Motion** - Animation library
- **sonner** - Toast notifications

**Key Component Patterns**:
- All form components use React Hook Form + Zod validation
- Data tables use `react-data-grid` for performance
- Rich text editing uses Plate.js (ProseMirror-based)
- Code editing uses CodeMirror

**Component Locations**:
- `components/ui/*` - Base UI components (button, input, dialog, etc.)
- `components/input/*` - Chat and form input components
- `components/chat/*` - Chat UI components
- `components/pages/*` - Page builder and block components
- `components/build/*` - Table builder components
- `components/elements/*` - Reusable element components

## Key Patterns and Conventions

### Server-Side Data Access

Use Supabase client for authenticated queries:

```typescript
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("workspace_id", user.workspace_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
```

### Client-Side Data Fetching

Use SWR for client-side data fetching with caching:

```typescript
import useSWR from "swr";

function MyComponent() {
  const { data, error, isLoading } = useSWR("/api/pages", (url) =>
    fetch(url).then((r) => r.json())
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return <div>{/* render data */}</div>;
}
```

### TypeScript and Zod Validation

Use Zod for runtime validation and type inference:

```typescript
import { z } from "zod";

const pageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Invalid slug format"),
  blocks: z.array(z.any()).default([]),
});

type Page = z.infer<typeof pageSchema>;

// In API route
const body = await request.json();
const result = pageSchema.safeParse(body);

if (!result.success) {
  return Response.json(
    { error: result.error.flatten() },
    { status: 400 }
  );
}
```

### React Patterns

**Server Components** (default):
- Use async/await for data fetching
- No client-side interactivity
- Automatically cached

**Client Components** (`"use client"`):
- Required for hooks, event handlers, browser APIs
- Use SWR for data fetching
- Keep client components small and focused

**Example**:
```typescript
// app/pages/page.tsx (Server Component)
import { createClient } from "@/lib/supabase/server";
import { PageList } from "./page-list";

export default async function PagesPage() {
  const supabase = await createClient();
  const { data: pages } = await supabase.from("pages").select("*");

  return <PageList initialPages={pages} />;
}

// page-list.tsx (Client Component)
"use client";
import useSWR from "swr";

export function PageList({ initialPages }) {
  const { data: pages } = useSWR("/api/pages", fetcher, {
    fallbackData: initialPages,
  });

  return (
    <div>
      {pages.map((page) => (
        <div key={page.id}>{page.name}</div>
      ))}
    </div>
  );
}
```

### Code Quality Standards

This project uses **Ultracite** (a Biome wrapper) for strict linting and formatting. Key rules:

**TypeScript**:
- No `any` types (use `unknown` with type guards)
- No enums (use const objects or union types)
- Use `import type` for type-only imports
- Use `export type` for type exports
- Explicit function return types for public APIs

**React**:
- Arrow functions for components
- No Array index as keys
- Always include `key` in lists
- Use `<>...</>` instead of `<Fragment>`
- Proper dependency arrays in hooks

**Accessibility**:
- Always include `type` attribute for buttons
- Use semantic HTML elements
- Include ARIA labels where needed
- Ensure keyboard navigation works

**Code Style**:
- Use `const` by default, `let` when mutation needed
- No `var` declarations
- Use template literals over string concatenation
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Use `for...of` instead of `.forEach()`

Run `pnpm lint` to check, `pnpm format` to auto-fix.

## Environment Setup

Create `.env.local`:

```bash
# Application Mode (required)
APP_MODE=local  # 'local' or 'hosted' - determines database architecture
NEXT_PUBLIC_APP_MODE=local  # Must match APP_MODE - controls UI features like Dev menu

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Database (required)
POSTGRES_URL=your_postgres_connection_string

# AI Providers (required for AI features)
OPENAI_API_KEY=your_openai_key
XAI_API_KEY=your_xai_key  # Optional, for xAI models

# AI Gateway (optional, auto-configured on Vercel)
AI_GATEWAY_API_KEY=your_gateway_key  # Only needed for non-Vercel deployments

# Vercel (optional)
VERCEL_URL=your_vercel_url  # Auto-set on Vercel deployments
```

## Development Notes

- **Package Manager**: Uses pnpm (version `10.24.0` - see `packageManager` field)
- **Node Version**: Requires Node.js 18+ for Next.js 16
- **Type Safety**: Strict TypeScript 5.9 with Ultracite linting
- **Database Migrations**: All migrations in `supabase/migrations/` as SQL files. Drizzle migrations in `lib/db/migrations/` are reference only.
- **Hot Reload**: Uses Turbopack (`--turbo` flag) for faster development
- **Debugging**: Check browser console for client errors, terminal for server logs
- **Testing**: Playwright tests configured - set `PLAYWRIGHT=True` environment variable when running tests
