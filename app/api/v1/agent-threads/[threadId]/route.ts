import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import {
  deleteAgentThread,
  getAgentThread,
  updateAgentThread,
} from "@/server/repositories/agent-threads";

const stateSchema = z.object({
  events: z.array(z.unknown()),
  session: z.object({
    continuationToken: z.string().optional(),
    sessionId: z.string().optional(),
    streamIndex: z.number().int().nonnegative(),
  }),
});

const updateSchema = z.object({
  state: stateSchema.optional(),
  title: z.string().nullable().optional(),
});

export const GET = endpoint<undefined, { threadId: string }>({
  auth: "required",
  async handler({ user, params }) {
    const thread = await getAgentThread(
      user.workspaceId,
      user.userId,
      params.threadId
    );
    if (!thread) {
      throw new ApiError(404, "Thread not found");
    }
    return { data: { thread } };
  },
  permission: "chat.view",
});

export const PATCH = endpoint<
  z.infer<typeof updateSchema>,
  { threadId: string }
>({
  auth: "required",
  async handler({ user, params, body, requestId }) {
    const thread = await updateAgentThread(
      user.workspaceId,
      user.userId,
      params.threadId,
      body
    );
    if (!thread) {
      throw new ApiError(404, "Thread not found");
    }

    // The event log is the bulk of the payload and is already durable in the
    // row; auditing it verbatim would make every keystroke-sized persist a
    // multi-kilobyte audit entry. Record the shape instead.
    await writeAuditLog({
      action: "agent_threads.updated",
      actorUserId: user.userId,
      changes: {
        eventCount: body.state?.events.length,
        titleChanged: body.title !== undefined,
      },
      requestId,
      resourceId: thread.id,
      resourceType: "agent_thread",
      workspaceId: user.workspaceId,
    });

    return { data: { thread } };
  },
  permission: "chat.create",
  schema: updateSchema,
});

export const DELETE = endpoint<undefined, { threadId: string }>({
  auth: "required",
  async handler({ user, params, requestId }) {
    const deleted = await deleteAgentThread(
      user.workspaceId,
      user.userId,
      params.threadId
    );
    if (!deleted) {
      throw new ApiError(404, "Thread not found");
    }

    await writeAuditLog({
      action: "agent_threads.deleted",
      actorUserId: user.userId,
      changes: {},
      requestId,
      resourceId: params.threadId,
      resourceType: "agent_thread",
      workspaceId: user.workspaceId,
    });

    return { data: { success: true } };
  },
  permission: "chat.create",
});
