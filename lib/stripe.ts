import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-11-17.clover" as any, // Cast to any to avoid type mismatch if the type definitions are slightly off
  typescript: true,
});
