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
  async handler({ user }) {
    const pages = await listPages(user.tenant);
    return { data: { pages } };
  },
  permission: "pages.view",
});

export const POST = endpoint<Record<string, unknown>>({
  auth: "required",
  async handler({ user, body, requestId }) {
    const page = await createPage(user.tenant, body);

    await writeAuditLog({
      action: "pages.created",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: (page as { id?: string }).id ?? null,
      resourceType: "page",
      workspaceId: user.workspaceId,
    });

    return { data: { page }, status: 201 };
  },
  permission: "pages.edit",
  schema: createPageSchema,
});
