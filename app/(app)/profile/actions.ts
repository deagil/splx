"use server";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { z } from "zod";
import { user } from "@/lib/db/schema";
import { getAppMode, resolveTenantContext } from "@/lib/server/tenant/context";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { getAuthenticatedUser } from "@/lib/supabase/server";

const profileSchema = z.object({
  ai_context: z.string().trim().max(2000).optional(),
  avatar_url: z
    .string()
    .trim()
    .url("Please provide a valid URL")
    .or(z.literal(""))
    .optional(),
  email: z.string().email("Please provide a valid email"),
  firstname: z.string().min(1, "First name is required"),
  job_title: z.string().trim().max(200).optional(),
  lastname: z.string().min(1, "Last name is required"),
  profile_pic_url: z
    .string()
    .trim()
    .url("Please provide a valid URL")
    .or(z.literal(""))
    .optional(),
});

export interface UpdateProfileState {
  message?: string;
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
}

export async function updateProfile(
  _: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      redirect("/signin");
    }

    const validatedData = profileSchema.parse({
      ai_context: formData.get("ai_context"),
      avatar_url: formData.get("avatar_url"),
      email: formData.get("email"),
      firstname: formData.get("firstname"),
      job_title: formData.get("job_title"),
      lastname: formData.get("lastname"),
      profile_pic_url: formData.get("profile_pic_url"),
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
          .update(user)
          .set({
            ai_context: normalizeNullable(validatedData.ai_context),
            avatar_url:
              normalizeNullable(validatedData.avatar_url) ??
              normalizeNullable(validatedData.profile_pic_url),
            email: validatedData.email,
            firstname: validatedData.firstname,
            job_title: normalizeNullable(validatedData.job_title),
            lastname: validatedData.lastname,
          })
          .where(eq(user.id, authUser.id));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      const store = await getResourceStore(tenant);
      try {
        await store.withSqlClient((db) =>
          db
            .update(user)
            .set({
              ai_context: normalizeNullable(validatedData.ai_context),
              avatar_url:
                normalizeNullable(validatedData.avatar_url) ??
                normalizeNullable(validatedData.profile_pic_url),
              email: validatedData.email,
              firstname: validatedData.firstname,
              job_title: normalizeNullable(validatedData.job_title),
              lastname: validatedData.lastname,
            })
            .where(eq(user.id, authUser.id))
        );
      } finally {
        await store.dispose();
      }
    }

    revalidatePath("/profile");
    revalidatePath("/preferences");

    return {
      message: "Profile updated successfully",
      status: "success",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues
        .map((issue) => {
          const field = issue.path.join(".") || "field";
          return `${field}: ${issue.message}`;
        })
        .filter(Boolean);
      return {
        message:
          messages.join("; ") ||
          "Please check the highlighted fields and try again.",
        status: "invalid_data",
      };
    }

    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }

    console.error("Failed to update profile:", error);
    return {
      message: "Failed to update profile",
      status: "failed",
    };
  }
}

export async function getUserProfile() {
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
        const [userData] = await db
          .select()
          .from(user)
          .where(eq(user.id, authUser.id))
          .limit(1);

        return userData ?? null;
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      const store = await getResourceStore(tenant);
      try {
        const [userData] = await store.withSqlClient((db) =>
          db.select().from(user).where(eq(user.id, authUser.id)).limit(1)
        );

        return userData ?? null;
      } finally {
        await store.dispose();
      }
    }
  } catch (error) {
    console.error("Failed to load user profile:", error);
    return null;
  }
}
