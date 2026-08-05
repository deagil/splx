import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { type NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { STRIPE_PLUS_PRICE_ID } from "@/lib/constants";
import { user, workspace } from "@/lib/db/schema";
import { getAppMode } from "@/lib/server/tenant/context";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const workspaceId = session.metadata?.workspaceId;

    if (!workspaceId) {
      console.error("No workspace ID in session metadata");
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    if (!subscriptionId || !customerId) {
      console.error("Missing subscription or customer ID");
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Get current user to mark onboarding as complete
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      console.error("No authenticated user in Stripe callback");
      return NextResponse.redirect(new URL("/signin", req.url));
    }

    // Update workspace with subscription details AND mark user onboarding as complete
    const mode = getAppMode();

    if (mode === "hosted") {
      const sql = postgres(process.env.POSTGRES_URL!);
      const db = drizzle(sql);

      try {
        // Update workspace with Stripe details
        await db
          .update(workspace)
          .set({
            plan: "plus",
            stripe_customer_id: customerId,
            stripe_price_id: STRIPE_PLUS_PRICE_ID,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date(),
          })
          .where(eq(workspace.id, workspaceId));

        // Mark user onboarding as complete
        await db
          .update(user)
          .set({
            onboarding_completed: true,
          })
          .where(eq(user.id, authUser.id));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else {
      // Local mode - use tenant context
      try {
        const { resolveTenantContext } = await import(
          "@/lib/server/tenant/context"
        );
        const tenant = await resolveTenantContext();

        const store = await getResourceStore(tenant);
        try {
          // Update workspace with Stripe details
          await store.withSqlClient((db) =>
            db
              .update(workspace)
              .set({
                plan: "plus",
                stripe_customer_id: customerId,
                stripe_price_id: STRIPE_PLUS_PRICE_ID,
                stripe_subscription_id: subscriptionId,
                updated_at: new Date(),
              })
              .where(eq(workspace.id, workspaceId))
          );

          // Mark user onboarding as complete
          await store.withSqlClient((db) =>
            db
              .update(user)
              .set({
                onboarding_completed: true,
              })
              .where(eq(user.id, authUser.id))
          );
        } finally {
          await store.dispose();
        }
      } catch (e) {
        console.error("Failed to update workspace in local mode", e);
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
    }

    // Redirect to dashboard on success
    return NextResponse.redirect(new URL("/", req.url));
  } catch (error) {
    console.error("Error handling Stripe callback:", error);
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
}
