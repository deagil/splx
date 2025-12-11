import { eq } from "drizzle-orm";
import { role, workspace } from "@/lib/db/schema";
import type { DbClient } from "./context";

type RoleDefinition = {
  id: string;
  label: string;
  description: string;
  level: number;
};

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: "admin",
    label: "Admin",
    description: "Full access to all workspace features",
    level: 100,
  },
  {
    id: "builder",
    label: "Builder",
    description:
      "Builder access for creating pages, data models, and automations; limited billing/workspace settings",
    level: 80,
  },
  {
    id: "user",
    label: "User",
    description:
      "Standard member access for using configured pages, buttons, and tools without changing core systems",
    level: 50,
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Read-only access to workspace data and pages",
    level: 10,
  },
];

export async function seedDefaultRoles(db: DbClient, workspaceId: string) {
  const [workspaceExists] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);

  if (!workspaceExists) {
    // Workspace was not found; nothing to seed
    return;
  }

  try {
    await db
      .insert(role)
      .values(
        DEFAULT_ROLE_DEFINITIONS.map((definition) => ({
          workspace_id: workspaceId,
          id: definition.id,
          label: definition.label,
          description: definition.description,
          level: definition.level,
        })),
      )
      .onConflictDoNothing();
  } catch (error) {
    // If another request seeded roles concurrently, ignore and continue
    const [existing] = await db
      .select({ id: role.id })
      .from(role)
      .where(eq(role.workspace_id, workspaceId))
      .limit(1);

    if (!existing) {
      throw error;
    }
  }
}
