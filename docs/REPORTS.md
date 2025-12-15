# Reports – User & Technical Guide

## Summary
- Reports let you describe an insight in natural language, generate a safe read-only SQL query with AI, and view the result as a chart plus tabular data.  
- Builder lives at `/data/reports/builder`, listing at `/data/reports`, and detail at `/data/reports/[id]`.  
- AI flow reuses the conversational UI to ask clarifying questions, propose a final report (SQL + chart hints), then saves to the `reports` table.  
- Execution is guarded: only `SELECT`, auto-wrapped with `LIMIT 500`, trailing semicolons stripped, and run against the workspace resource store.

## User Guide (simple)
### Create a report
1) Go to `/data/reports/builder`.  
2) Describe what you want (e.g., “total order value by status for last 6 months”).  
3) Click “Start with AI”; answer any clarifying questions in the AI Conversation pane.  
4) When a final report is proposed, review the SQL preview and click “Save & View”.  
5) You’ll be sent to `/data/reports/[id]` with the chart on top and data table below.

### Browse & open
- `/data/reports` lists all reports (title, description, chart type hint).  
- Click a report to view its chart and underlying data.

### Detail view
- Top: chart rendered via shadcn/Recharts.  
- Right: SQL shown for transparency.  
- Bottom: result table for validation (up to 500 rows).  
- If no chart appears, check the debug panel in dev mode for row/column detection.

### Safety & limits
- Only read-only `SELECT` queries; mutating/DDL blocked.  
- Results capped at 500 rows.  
- Chart auto-picks the first non-numeric column as x-axis and a numeric column as y-axis; numeric strings are coerced.

## Technical Guide
### Data model
- Table: `reports` (`id`, `workspace_id`, `title`, `description`, `sql`, `chart_type`, `chart_config`, `created_by`, timestamps).  
- Schema: `lib/db/schema.ts`; validation: `lib/server/reports/schema.ts`; repository: `lib/server/reports/repository.ts`.

### APIs
- List/create: `app/(app)/api/reports/route.ts` (requires `tables.view` / `tables.edit`).  
- Read one: `app/(app)/api/reports/[reportId]/route.ts`.  
- AI generation (SSE): `app/(app)/api/reports/generate/route.ts` — streams `report-ui` events.

### AI flow
- Conversational UI schema: `lib/ai/reports-ui-schema.ts` (types: question, variants, clarification, final-report).  
- UI components reused from conversational builder: `components/conversational-builder/steps.tsx`.  
- Report builder UI: `components/reports/report-builder.tsx` (client).  
- Generation endpoint uses `toolChoice` to force `ui` tool; system prompt enforces read-only SQL, chart hints, and table-context awareness (lists workspace tables/columns).  
- SSE client listens for `report-ui` events to drive the wizard; on final-report, it sets draft state and enables save.

### Execution pipeline
1) Detail page (server): fetch report + run query via `runReportQuery`.  
2) `runReportQuery` sanitizes SQL (strips trailing semicolons), asserts `SELECT`, wraps as subquery with `LIMIT 500`, executes via resource store (`getResourceStore`).  
3) Result rows passed to client chart component.

### Chart rendering
- Client chart: `components/reports/report-chart.tsx` with `components/ui/chart.tsx` (shadcn/Recharts wrapper).  
- Key selection: detail page derives `xKey` as first non-numeric column; `yKey` as first numeric/numeric-like column across rows; numeric strings coerced to numbers.  
- Chart shows bar chart by default with tooltip/legend from shadcn wrapper.

### Error & debug
- Dev-only debug panel on detail page shows row count, chosen keys, per-column numeric detection, and query errors.  
- Common failure: trailing semicolon or non-SELECT — now sanitized/blocked; empty rows will suppress the chart.

### Navigation
- Top nav “Data > Reports” points to `/data/reports`.  
- Builder CTA from listing to `/data/reports/builder`.






