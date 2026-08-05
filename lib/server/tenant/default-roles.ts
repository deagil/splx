import { eq } from "drizzle-orm";
import { role, workspace } from "@/lib/db/schema";
import type { DbClient } from "./context";

interface RoleDefinition {
  description: string;
  id: string;
  label: string;
  level: number;
}

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    description: "Full access to all workspace features",
    id: "admin",
    label: "Admin",
    level: 100,
  },
  {
    description:
      "Builder access for creating pages, data models, and automations; limited billing/workspace settings",
    id: "builder",
    label: "Builder",
    level: 80,
  },
  {
    description:
      "Standard member access for using configured pages, buttons, and tools without changing core systems",
    id: "user",
    label: "User",
    level: 50,
  },
  {
    description: "Read-only access to workspace data and pages",
    id: "viewer",
    label: "Viewer",
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
          description: definition.description,
          id: definition.id,
          label: definition.label,
          level: definition.level,
          workspace_id: workspaceId,
        }))
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
