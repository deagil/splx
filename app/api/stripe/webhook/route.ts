import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { workspace } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getAppMode } from "@/lib/server/tenant/context";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import Stripe from "stripe";

const relevantEvents = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;
  if (!workspaceId) {
    console.error("No workspace ID in checkout session metadata");
    return;
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
    console.error("Missing subscription or customer ID in checkout session");
    return;
  }

  // Retrieve subscription to get trial end and current period end
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionData = subscriptionResponse as unknown as {
    items: { data: Array<{ price: { id: string } }> };
    current_period_end: number | null;
    status: string;
    metadata?: { workspaceId?: string };
  };

  await updateWorkspaceSubscription(workspaceId, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: subscriptionData.items.data[0]?.price.id ?? null,
    stripe_current_period_end: subscriptionData.current_period_end
      ? new Date(subscriptionData.current_period_end * 1000)
      : null,
    plan: subscriptionData.status === "trialing" || subscriptionData.status === "active" ? "plus" : "lite",
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Type assertion for invoice.subscription which may be string | Subscription | null
  const invoiceData = invoice as unknown as {
    subscription?: string | { id: string } | null;
  };
  const subscriptionId =
    typeof invoiceData.subscription === "string"
      ? invoiceData.subscription
      : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionData = subscriptionResponse as unknown as {
    current_period_end: number | null;
    metadata?: { workspaceId?: string };
  };
  const workspaceId = subscriptionData.metadata?.workspaceId;

  // If workspaceId is not in subscription metadata, try to find it by customer ID
  if (!workspaceId) {
    console.warn("No workspace ID in subscription metadata for invoice.paid");
    return;
  }

  await updateWorkspaceSubscription(workspaceId, {
    stripe_current_period_end: subscriptionData.current_period_end
      ? new Date(subscriptionData.current_period_end * 1000)
      : null,
    plan: "plus",
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Log payment failure - you may want to send email notifications
  console.error("Invoice payment failed:", invoice.id);
  // Optionally downgrade the workspace or set a flag
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Type assertion for subscription properties
  const subscriptionData = subscription as unknown as {
    metadata?: { workspaceId?: string };
    status: string;
    current_period_end: number | null;
  };
  const workspaceId = subscriptionData.metadata?.workspaceId;
  if (!workspaceId) return;

  const plan =
    subscriptionData.status === "active" || subscriptionData.status === "trialing"
      ? "plus"
      : "lite";

  await updateWorkspaceSubscription(workspaceId, {
    stripe_current_period_end: subscriptionData.current_period_end
      ? new Date(subscriptionData.current_period_end * 1000)
      : null,
    plan,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionData = subscription as unknown as {
    metadata?: { workspaceId?: string };
  };
  const workspaceId = subscriptionData.metadata?.workspaceId;
  if (!workspaceId) return;

  await updateWorkspaceSubscription(workspaceId, {
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_current_period_end: null,
    plan: "lite",
  });
}

async function updateWorkspaceSubscription(
  workspaceId: string,
  data: {
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    stripe_price_id?: string | null;
    stripe_current_period_end?: Date | null;
    plan?: string;
  }
) {
  const mode = getAppMode();

  if (mode === "hosted") {
    const sql = postgres(process.env.POSTGRES_URL!);
    const db = drizzle(sql);

    try {
      await db
        .update(workspace)
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where(eq(workspace.id, workspaceId));
    } finally {
      await sql.end({ timeout: 5 });
    }
  } else {
    // Local mode - use direct DB connection
    // In local mode, we might not have tenant context from webhooks
    // So we use direct postgres connection like hosted mode
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("No database URL configured for local mode webhook");
      return;
    }

    const sql = postgres(dbUrl);
    const db = drizzle(sql);

    try {
      await db
        .update(workspace)
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where(eq(workspace.id, workspaceId));
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
}
