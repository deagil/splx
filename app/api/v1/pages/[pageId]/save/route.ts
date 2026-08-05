import { z } from "zod";
import { updatePage } from "@/lib/server/pages";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";
import { emitEvent } from "@/server/lib/events";

type Params = { pageId: string };

const savePageSchema = z.record(z.string(), z.unknown());

/**
 * `PageNotFoundError` from `lib/server/pages` is mapped to 404 by
 * `handleError`, so the handler does not need to check for it.
 */
const save = endpoint<Record<string, unknown>, Params>({
  auth: "required",
  permission: "pages.edit",
  schema: savePageSchema,
  async handler({ user, params, body, requestId }) {
    const page = await updatePage(user.tenant, params.pageId, body);

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "pages.updated",
      resourceType: "page",
      resourceId: params.pageId,
      changes: body,
      requestId,
    });

    // Page definitions are system objects an automation may want to react to.
    await emitEvent({
      workspaceId: user.workspaceId,
      eventName: "page.updated",
      payload: { pageId: params.pageId },
      actorUserId: user.userId,
      requestId,
    });

    return { data: { page } };
  },
});

export const PUT = save;
// The builder autosaves with POST; same semantics as PUT.
export const POST = save;
