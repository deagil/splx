import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";
import {
  createAgentThread,
  listAgentThreads,
} from "@/server/repositories/agent-threads";

const createSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().nullable().optional(),
});

export const GET = endpoint({
  auth: "required",
  async handler({ user }) {
    const threads = await listAgentThreads(user.workspaceId, user.userId);
    return { data: { threads } };
  },
  permission: "chat.view",
});

export const POST = endpoint<z.infer<typeof createSchema>>({
  auth: "required",
  async handler({ user, body, requestId }) {
    const thread = await createAgentThread(user.workspaceId, user.userId, {
      id: body.id,
      title: body.title,
    });

    await writeAuditLog({
      action: "agent_threads.created",
      actorUserId: user.userId,
      requestId,
      resourceId: thread.id,
      resourceType: "agent_thread",
      workspaceId: user.workspaceId,
    });

    return { data: { thread }, status: 201 };
  },
  permission: "chat.create",
  schema: createSchema,
});
