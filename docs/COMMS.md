# Comms

Transactional email templates and outbound send via workflows.

## Concepts

| Piece | Role |
| --- | --- |
| `email_templates` | Named templates: subject, ordered **blocks**, declared **variables**, **sample data**, `draft` / `active` |
| `email_settings` | Per-workspace from name / from email / reply-to |
| `email_sends` | Delivery log (status, provider id, resolved variables) |
| `send_email` action | Workflow step that picks a template, maps variables, sends |

UI lives under top-level **Comms** (`/comms/templates`). From name / email / reply-to live in **Workspace Settings → Email** (`/workspace-settings?section=email`). Only **active** templates appear in the workflow mapping UI.

## Authoring model

Templates are **not** edited as TSX. Authors compose a small set of blocks (same mental model as page sections):

- `header`, `heading`, `text`, `button`, `image`, `divider`, `spacer`, `footer`

Starter structures (Welcome, Order received, Notification) seed blocks + variables. Most edits are copy and field names.

Merge tokens in subject and block text use `{{variable.key}}` (inline). Custom constants and nested-looking names (`customer.firstName`, `CURRENT_INTEREST_RATE`) are just string keys on the template’s variable schema.

At send time, HTML is compiled with `@react-email/components` + `@react-email/render`.

## The editor

`/comms/templates/:id` is a full-height, non-scrolling split: a tabbed config
panel (Content · Data · Setup) beside the **editable canvas**, which is the email
itself. Click a block to select it, type on it directly, hover for a toolbar and
`＋` insert points; the left list and the canvas share one selection and one
drag-and-drop context.

**Two renderers, one set of styles.** `server/comms/render.tsx` (React Email →
delivered HTML) and `components/comms/canvas/*` (DOM → the canvas) both read
`lib/comms/block-styles.ts`. The canvas sits inside the app's Tailwind cascade
and the email does not, so anything affecting layout must be an inline style from
that module — never a Tailwind class on a block. `server/comms/render-parity.test.ts`
snapshots the shared styles so a change to one renderer can't silently skip the
other.

**Merge tokens are chips.** Every text field is a `TokenField`
(`components/comms/token-field/`): a contenteditable that stores the plain
`{{key}}` string but displays each token as a chip showing the variable's human
label. Typing `{{` opens a caret-anchored menu of declared variables, whose last
item declares a new one on the spot — so data is never a prerequisite for
writing. Undeclared tokens still render, in a warning style, with a "Declare"
action. See the module header in `token-dom.ts` for the DOM invariants
(text/chip alternation with ZWSP fillers) that make the caret behave.

**Previews.** `Edit | Preview | Text` on the canvas footer. Preview merges
against sample data client-side and costs nothing; Text fetches the real server
render (debounced, and only while visible). `email_templates.sample_data` holds
author-supplied preview values keyed by variable key, layered over type-derived
placeholders by `lib/comms/sample-values.ts` — the same layering the preview and
test-send routes use, so no two previews can disagree. Sample data is never used
for real sends.

## Variables and workflow mapping

Each template declares:

```ts
{
  key: "customer.firstName",
  label: "Customer first name",
  type: "string" | "number" | "boolean" | "date" | "email" | "url",
  required: boolean
}
```

The workflow `send_email` step input:

```json
{
  "type": "send_email",
  "label": "Send email",
  "input": {
    "templateId": "<uuid>",
    "to": "{{event.payload.record.email}}",
    "mapping": {
      "customer.firstName": "{{event.payload.record.firstname}}",
      "actionUrl": "{{event.payload.record.url}}"
    },
    "replyTo": "optional@example.com"
  }
}
```

Path templates follow the same whole-string rules as other workflow actions (`{{event…}}`, `{{steps.N.output…}}`) — see [WORKFLOWS.md](./WORKFLOWS.md). The worker resolves `to` and each mapping value before the action runs; the action then validates required variables, merges into the template, and sends.

## Delivery

- Provider interface: `server/comms/provider.ts`
- v1 implementation: **Resend** via `RESEND_API_KEY`
- From address: Workspace Settings → Email (`email_settings`)
- Without `RESEND_API_KEY` in non-production, sends are logged and return a fake message id

Domain verification is done in the Resend dashboard for v1.

## API

| Route | Permission |
| --- | --- |
| `GET/POST /api/v1/email-templates` | `comms.view` / `comms.edit` |
| `GET/PATCH/DELETE /api/v1/email-templates/:id` | view / edit |
| `POST /api/v1/email-templates/:id/preview` | `comms.view` |
| `POST /api/v1/email-templates/:id/test-send` | `comms.edit` |
| `GET/PUT /api/v1/email-settings` | view / edit |

Email settings UI: **Home → Workspace Settings → Email** (`/workspace-settings?section=email`). Legacy `/comms/settings` redirects there.

## Adding a block type

1. Extend `EmailBlock` in `lib/comms/types.ts`
2. Add its styles to `lib/comms/block-styles.ts` (both renderers read these)
3. Render it in `server/comms/render.tsx`
4. Render it in `components/comms/canvas/block-content.tsx`, using `TokenField`
   for anything the author should type directly on the email
5. Add its label/icon to `components/comms/canvas/block-meta.ts` and any
   non-text properties to `components/comms/panels/content-panel.tsx`
6. Extend the fixture in `server/comms/render-parity.test.ts`

## Adding a provider

Implement `EmailProvider` in `server/comms/provider.ts` and switch `getEmailProvider()`. Keep Resend as the default unless env selects another backend.

## Permissions

`comms.view` — list/read templates and settings  
`comms.edit` — create/update/delete, settings, test send  

Builders and admins get both; users and viewers get view only (see `server/permissions/definitions.ts`).
