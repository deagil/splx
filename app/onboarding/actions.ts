"use server";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { z } from "zod";
import { STRIPE_PLUS_PRICE_ID } from "@/lib/constants";
import { user, workspace } from "@/lib/db/schema";
import { getAppMode, resolveTenantContext } from "@/lib/server/tenant/context";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const leadingSlashRegex = /^\//;

const onboardingSchema = z.object({
  ai_generation_guidance: z.string().trim().max(4000).optional(),
  business_description: z.string().trim().max(4000).optional(),
  database_connection: z.string().trim().optional(),
  firstname: z.string().min(1, "First name is required"),
  job_title: z.string().trim().max(200).optional(),
  lastname: z.string().min(1, "Last name is required"),
  profile_pic_url: z
    .string()
    .trim()
    .url("Please provide a valid URL")
    .or(z.literal(""))
    .optional(),
  role_experience: z.string().trim().max(2000).optional(),
  selected_plan: z.enum(["lite", "plus", "pro"]).default("lite"),
  technical_proficiency: z
    .enum(["less", "regular", "more"])
    .default("regular")
    .optional(),
  tone_of_voice: z.string().trim().max(2000).optional(),
  workspace_name: z.string().min(1, "Workspace name is required"),
  workspace_profile_pic_url: z
    .string()
    .trim()
    .url("Please provide a valid URL")
    .or(z.literal(""))
    .optional(),
  workspace_url: z.string().min(1, "Workspace URL is required"),
});

export interface CompleteOnboardingState {
  message?: string;
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
}

export async function completeOnboarding(
  _: CompleteOnboardingState,
  formData: FormData
): Promise<CompleteOnboardingState> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      redirect("/signin");
    }

    const validatedData = onboardingSchema.parse({
      ai_generation_guidance: formData.get("ai_generation_guidance"),
      business_description: formData.get("business_description"),
      database_connection: formData.get("database_connection"),
      firstname: formData.get("firstname"),
      job_title: formData.get("job_title"),
      lastname: formData.get("lastname"),
      profile_pic_url: formData.get("profile_pic_url"),
      role_experience: formData.get("role_experience"),
      selected_plan: formData.get("selected_plan"),
      technical_proficiency: formData.get("technical_proficiency"),
      tone_of_voice: formData.get("tone_of_voice"),
      workspace_name: formData.get("workspace_name"),
      workspace_profile_pic_url: formData.get("workspace_profile_pic_url"),
      workspace_url: formData.get("workspace_url"),
    });

    const normalizeNullable = (value?: string | null) => {
      if (!value) {
        return null;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length === 0 ? null : trimmedValue;
    };

    // In hosted mode, user and workspace are system tables in the main database
    // In local mode, they're in the tenant database via resource store
    const mode = getAppMode();
    const tenant = await resolveTenantContext();

    if (mode === "hosted") {
      // Query/update user and workspace directly from main database
      const sql = postgres(process.env.POSTGRES_URL!);
      const db = drizzle(sql);

      try {
        const [existingUser] = await db
          .select()
          .from(user)
          .where(eq(user.id, authUser.id))
          .limit(1);

        const userPayload = {
          ai_context: normalizeNullable(validatedData.role_experience),
          ai_guidance: normalizeNullable(validatedData.ai_generation_guidance),
          ai_tone: normalizeNullable(validatedData.tone_of_voice),
          avatar_url: normalizeNullable(validatedData.profile_pic_url),
          firstname: validatedData.firstname,
          job_title: normalizeNullable(validatedData.job_title),
          lastname: validatedData.lastname,
          // Only mark onboarding as complete for free plan; Plus plan completes after Stripe callback
          onboarding_completed: validatedData.selected_plan === "lite",
          proficiency: validatedData.technical_proficiency ?? "regular",
        };

        if (existingUser) {
          await db
            .update(user)
            .set(userPayload)
            .where(eq(user.id, authUser.id));
        } else {
          await db.insert(user).values({
            email: authUser.email ?? "",
            id: authUser.id,
            ...userPayload,
          });
        }

        await db
          .update(workspace)
          .set({
            avatar_url: normalizeNullable(
              validatedData.workspace_profile_pic_url
            ),
            description: normalizeNullable(validatedData.business_description),
            metadata: {
              selected_plan: validatedData.selected_plan,
            },
            name: validatedData.workspace_name,
            slug: validatedData.workspace_url.trim(),
          })
          .where(eq(workspace.id, tenant.workspaceId));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      // Local mode: use resource store
      const store = await getResourceStore(tenant);
      try {
        const [existingUser] = await store.withSqlClient((db) =>
          db.select().from(user).where(eq(user.id, authUser.id)).limit(1)
        );

        const userPayload = {
          ai_context: normalizeNullable(validatedData.role_experience),
          ai_guidance: normalizeNullable(validatedData.ai_generation_guidance),
          ai_tone: normalizeNullable(validatedData.tone_of_voice),
          avatar_url: normalizeNullable(validatedData.profile_pic_url),
          firstname: validatedData.firstname,
          job_title: normalizeNullable(validatedData.job_title),
          lastname: validatedData.lastname,
          // Only mark onboarding as complete for free plan; Plus plan completes after Stripe callback
          onboarding_completed: validatedData.selected_plan === "lite",
          proficiency: validatedData.technical_proficiency ?? "regular",
        };

        if (existingUser) {
          await store.withSqlClient((db) =>
            db.update(user).set(userPayload).where(eq(user.id, authUser.id))
          );
        } else {
          await store.withSqlClient((db) =>
            db.insert(user).values({
              email: authUser.email ?? "",
              id: authUser.id,
              ...userPayload,
            })
          );
        }

        await store.withSqlClient((db) =>
          db
            .update(workspace)
            .set({
              avatar_url: normalizeNullable(
                validatedData.workspace_profile_pic_url
              ),
              description: normalizeNullable(
                validatedData.business_description
              ),
              metadata: {
                selected_plan: validatedData.selected_plan,
              },
              name: validatedData.workspace_name,
              slug: validatedData.workspace_url.trim(),
            })
            .where(eq(workspace.id, tenant.workspaceId))
        );
      } finally {
        await store.dispose();
      }
    }

    // Save database connection if provided
    if (
      validatedData.database_connection &&
      validatedData.database_connection.trim().length > 0
    ) {
      try {
        const connectionString = validatedData.database_connection.trim();
        // Parse connection string to extract details
        const url = new URL(connectionString);

        if (url.protocol.startsWith("postgres")) {
          const payload = {
            database: url.pathname.replace(leadingSlashRegex, ""),
            host: url.hostname,
            password: url.password
              ? decodeURIComponent(url.password)
              : undefined,
            port: url.port ? Number(url.port) : 5432,
            schema: url.searchParams.get("schema") ?? undefined,
            sslMode: "prefer" as const,
            username: decodeURIComponent(url.username),
          };

          // Import the function dynamically to avoid circular dependencies
          const { savePostgresWorkspaceApp } = await import(
            "@/lib/server/workspace-apps"
          );
          await savePostgresWorkspaceApp(tenant, payload);
        }
      } catch (error) {
        // Log error but don't fail onboarding if database connection fails
        console.error(
          "Failed to save database connection during onboarding:",
          error
        );
      }
    }

    if (validatedData.selected_plan === "plus") {
      const _mode = getAppMode();
      const { workspaceId } = tenant;

      // Ensure we have the correct workspace ID if in local mode (though tenant.workspaceId should be correct)

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        cancel_url: `${baseUrl}/`,
        customer_email: authUser.email,
        line_items: [
          {
            price: STRIPE_PLUS_PRICE_ID,
            quantity: 1,
          },
        ],
        metadata: {
          workspaceId,
        },
        mode: "subscription",
        payment_method_types: ["card"],
        subscription_data: {
          metadata: {
            workspaceId, // Also store on subscription for webhook lookups
          },
          trial_period_days: 7,
        },
        success_url: `${baseUrl}/api/stripe/callback?session_id={CHECKOUT_SESSION_ID}`,
      });

      if (session.url) {
        redirect(session.url);
      }
    }

    redirect("/");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        message: error.issues[0]?.message ?? "Invalid form data",
        status: "invalid_data",
      };
    }

    // If redirect was called, re-throw it
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }

    // Log the actual error for debugging
    console.error("Onboarding error:", error);

    return {
      message: "Failed to complete onboarding",
      status: "failed",
    };
  }
}
