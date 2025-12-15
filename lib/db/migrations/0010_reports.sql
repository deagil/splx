CREATE TABLE IF NOT EXISTS "reports"(
    "id" text PRIMARY KEY NOT NULL,
    "workspace_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "sql" text NOT NULL,
    "chart_type" text,
    "chart_config" jsonb NOT NULL DEFAULT '{}' ::jsonb,
    "created_by" uuid,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT "reports_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE,
    CONSTRAINT "reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id"),
    CONSTRAINT "reports_title_not_empty" CHECK ((char_length(btrim(COALESCE("title", ''::text))) > 0)),
    CONSTRAINT "reports_sql_not_empty" CHECK ((char_length(btrim(COALESCE("sql", ''::text))) > 0))
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_workspace_id_idx" ON "reports" USING btree("workspace_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_created_by_idx" ON "reports" USING btree("created_by");







