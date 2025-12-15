-- Add Stripe billing columns to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'lite';

-- Create index for faster lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_customer_id ON workspaces(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Create index for subscription lookups  
CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_subscription_id ON workspaces(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN workspaces.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN workspaces.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN workspaces.stripe_price_id IS 'Current Stripe price ID';
COMMENT ON COLUMN workspaces.stripe_current_period_end IS 'When the current billing period ends';
COMMENT ON COLUMN workspaces.plan IS 'Current plan: lite, plus, or pro';
