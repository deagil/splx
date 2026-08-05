import { z } from "zod";
import { updatePage } from "@/lib/server/pages";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";
import { emitEvent } from "@/server/lib/events";

interface Params {
  pageId: string;
}

const savePageSchema = z.record(z.string(), z.unknown());

/**
 * `PageNotFoundError` from `lib/server/pages` is mapped to 404 by
 * `handleError`, so the handler does not need to check for it.
 */
const save = endpoint<Record<string, unknown>, Params>({
  auth: "required",
  async handler({ user, params, body, requestId }) {
    const page = await updatePage(user.tenant, params.pageId, body);

    await writeAuditLog({
      action: "pages.updated",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: params.pageId,
      resourceType: "page",
      workspaceId: user.workspaceId,
    });

    // Page definitions are system objects an automation may want to react to.
    await emitEvent({
      actorUserId: user.userId,
      eventName: "page.updated",
      payload: { pageId: params.pageId },
      requestId,
      workspaceId: user.workspaceId,
    });

    return { data: { page } };
  },
  permission: "pages.edit",
  schema: savePageSchema,
});

export const PUT = save;
// The builder autosaves with POST; same semantics as PUT.
export const POST = save;
