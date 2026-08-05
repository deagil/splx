import { z } from "zod";
import { createPage, listPages } from "@/lib/server/pages";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";

/**
 * Page definitions. Validation lives in `lib/server/pages` (which already
 * parses with Zod), so the schema here only asserts the envelope is an object
 * and lets the domain layer reject the specifics.
 */
const createPageSchema = z.record(z.string(), z.unknown());

export const GET = endpoint({
  auth: "required",
  permission: "pages.view",
  async handler({ user }) {
    const pages = await listPages(user.tenant);
    return { data: { pages } };
  },
});

export const POST = endpoint<Record<string, unknown>>({
  auth: "required",
  permission: "pages.edit",
  schema: createPageSchema,
  async handler({ user, body, requestId }) {
    const page = await createPage(user.tenant, body);

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "pages.created",
      resourceType: "page",
      resourceId: (page as { id?: string }).id ?? null,
      changes: body,
      requestId,
    });

    return { data: { page }, status: 201 };
  },
});
