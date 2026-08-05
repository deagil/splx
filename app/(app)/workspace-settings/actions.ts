"use server";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { z } from "zod";
import { workspace } from "@/lib/db/schema";
import { getAppMode, resolveTenantContext } from "@/lib/server/tenant/context";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { getAuthenticatedUser } from "@/lib/supabase/server";

const workspaceSchema = z.object({
  avatar_url: z
    .string()
    .trim()
    .url("Please provide a valid URL")
    .or(z.literal(""))
    .optional(),
  description: z.string().trim().max(4000).optional(),
  name: z.string().min(1, "Workspace name is required"),
  slug: z.string().trim().optional(),
});

export interface UpdateWorkspaceState {
  message?: string;
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
}

export async function updateWorkspace(
  _: UpdateWorkspaceState,
  formData: FormData
): Promise<UpdateWorkspaceState> {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      redirect("/signin");
    }

    const validatedData = workspaceSchema.parse({
      avatar_url: formData.get("avatar_url"),
      description: formData.get("description"),
      name: formData.get("name"),
      slug: formData.get("slug"),
    });

    const normalizeNullable = (value?: string | null) => {
      if (!value) {
        return null;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length === 0 ? null : trimmedValue;
    };

    const mode = getAppMode();
    const tenant = await resolveTenantContext();

    if (mode === "hosted") {
      const sql = postgres(process.env.POSTGRES_URL!);
      const db = drizzle(sql);

      try {
        await db
          .update(workspace)
          .set({
            avatar_url: normalizeNullable(validatedData.avatar_url),
            description: normalizeNullable(validatedData.description),
            name: validatedData.name,
            slug: normalizeNullable(validatedData.slug),
          })
          .where(eq(workspace.id, tenant.workspaceId));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      const store = await getResourceStore(tenant);
      try {
        await store.withSqlClient((db) =>
          db
            .update(workspace)
            .set({
              avatar_url: normalizeNullable(validatedData.avatar_url),
              description: normalizeNullable(validatedData.description),
              name: validatedData.name,
              slug: normalizeNullable(validatedData.slug),
            })
            .where(eq(workspace.id, tenant.workspaceId))
        );
      } finally {
        await store.dispose();
      }
    }

    revalidatePath("/workspace-settings");

    return {
      message: "Workspace updated successfully",
      status: "success",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        message: error.issues[0]?.message ?? "Invalid form data",
        status: "invalid_data",
      };
    }

    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }

    console.error("Failed to update workspace:", error);
    return {
      message: "Failed to update workspace",
      status: "failed",
    };
  }
}

export async function getWorkspaceData() {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return null;
    }

    const mode = getAppMode();
    const tenant = await resolveTenantContext();

    if (mode === "hosted") {
      const sql = postgres(process.env.POSTGRES_URL!);
      const db = drizzle(sql);

      try {
        const [workspaceData] = await db
          .select()
          .from(workspace)
          .where(eq(workspace.id, tenant.workspaceId))
          .limit(1);

        return workspaceData ?? null;
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      const store = await getResourceStore(tenant);
      try {
        const [workspaceData] = await store.withSqlClient((db) =>
          db
            .select()
            .from(workspace)
            .where(eq(workspace.id, tenant.workspaceId))
            .limit(1)
        );

        return workspaceData ?? null;
      } finally {
        await store.dispose();
      }
    }
  } catch (error) {
    console.error("Failed to load workspace data:", error);
    return null;
  }
}
