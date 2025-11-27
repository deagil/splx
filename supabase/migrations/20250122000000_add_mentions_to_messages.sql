-- Add mentions column to messages table
-- This stores mention metadata separately from message parts
-- to allow displaying mentions as chips in the UI while sending enriched text to AI

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS mentions JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN messages.mentions IS 'Stores mention metadata array for displaying mentions as chips in UI. Mentions are stored separately from message parts to preserve original message format for display while sending enriched text to AI.';




