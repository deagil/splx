"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { AppMode } from "@/lib/app-mode";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PostgresFormState = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  schema: string;
  sslMode: "prefer" | "require" | "disable";
};

const POSTGRES_DEFAULT_STATE: PostgresFormState = {
  host: "",
  port: "5432",
  database: "",
  username: "",
  password: "",
  schema: "",
  sslMode: "prefer",
};

type PostgresConfigFormProps = {
  mode: AppMode;
  metadata?: Record<string, unknown>;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
};

export function PostgresConfigForm({
  mode,
  metadata,
  onSuccess,
  onCancel,
  className,
}: PostgresConfigFormProps) {
  const [form, setForm] = useState<PostgresFormState>(
    derivePostgresState(metadata)
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionString, setConnectionString] = useState("");
  const [connectionStringError, setConnectionStringError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (metadata && !dirty) {
      const nextState = derivePostgresState(metadata);
      setForm(nextState);
      setConnectionString(deriveConnectionString(metadata, nextState));
      setConnectionStringError(null);
    }
  }, [metadata, dirty]);

  const handleConnectionStringChange = useCallback((value: string) => {
    setConnectionString(value);
    const parsed = parseConnectionString(value);
    if (!parsed) {
      setConnectionStringError("Enter a valid Postgres connection string");
      return;
    }
    setConnectionStringError(null);
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      ...parsed,
    }));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        host: form.host.trim(),
        port: Number.parseInt(form.port, 10) || 5432,
        database: form.database.trim(),
        username: form.username.trim(),
        password: form.password ? form.password : undefined,
        schema: form.schema.trim() || undefined,
        sslMode: form.sslMode,
      };

      const response = await fetch("/api/workspace-apps/postgres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Failed to save Postgres settings");
      }

      toast.success("Postgres connection updated");
      setDirty(false);
      setForm((prev) => ({ ...prev, password: "" }));
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update Postgres connection"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={cn("space-y-6", className)} onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor="pg-connection">Connection string</FieldLabel>
        <Input
          id="pg-connection"
          name="pg-connection"
          spellCheck={false}
          placeholder="postgresql://user:pass@host:5432/db"
          value={connectionString}
          onChange={(event) => handleConnectionStringChange(event.target.value)}
        />
        {connectionStringError ? (
          <p className="text-xs text-destructive">{connectionStringError}</p>
        ) : (
          <FieldDescription>
            This is written directly to your{" "}
            {mode === "local" ? ".env.local file" : "workspace connection"}.
          </FieldDescription>
        )}
      </Field>

      <div>
        <button
          type="button"
          className="text-sm font-medium text-blue-700 transition hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? "Hide" : "Show"} advanced fields
        </button>
        {showAdvanced ? (
          <div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pg-host">Host</FieldLabel>
                <Input
                  id="pg-host"
                  name="pg-host"
                  placeholder="db.example.com"
                  required
                  value={form.host}
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, host: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pg-port">Port</FieldLabel>
                <Input
                  id="pg-port"
                  name="pg-port"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.port}
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, port: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pg-database">Database</FieldLabel>
                <Input
                  id="pg-database"
                  name="pg-database"
                  placeholder="splx"
                  required
                  value={form.database}
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, database: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pg-schema">Schema (optional)</FieldLabel>
                <Input
                  id="pg-schema"
                  name="pg-schema"
                  placeholder="public"
                  value={form.schema}
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, schema: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pg-username">Username</FieldLabel>
                <Input
                  id="pg-username"
                  name="pg-username"
                  placeholder="workspace_user"
                  required
                  value={form.username}
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, username: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pg-password">Password</FieldLabel>
                <Input
                  id="pg-password"
                  name="pg-password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, password: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                />
                <FieldDescription>
                  Entering a password will replace the stored credential.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pg-ssl">SSL mode</FieldLabel>
                <Select
                  value={form.sslMode}
                  onValueChange={(value: PostgresFormState["sslMode"]) => {
                    setDirty(true);
                    const next = { ...form, sslMode: value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                >
                  <SelectTrigger id="pg-ssl">
                    <SelectValue placeholder="Select SSL mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prefer">Prefer (default)</SelectItem>
                    <SelectItem value="require">Require</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setDirty(false);
              const resetState = derivePostgresState(metadata);
              setForm(resetState);
              setConnectionString(deriveConnectionString(metadata ?? {}, resetState));
              setConnectionStringError(null);
            }}
          >
            Reset
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving || !dirty || Boolean(connectionStringError)}
        >
          {saving ? "Saving..." : "Save connection"}
        </Button>
      </div>
    </form>
  );
}

function derivePostgresState(
  metadata?: Record<string, unknown>
): PostgresFormState {
  if (!metadata) {
    return POSTGRES_DEFAULT_STATE;
  }

  return {
    host: (metadata.host as string) ?? "",
    port: metadata.port ? String(metadata.port) : POSTGRES_DEFAULT_STATE.port,
    database: (metadata.database as string) ?? "",
    username: (metadata.username as string) ?? "",
    password: "",
    schema: (metadata.schema as string) ?? "",
    sslMode:
      (metadata.sslMode as PostgresFormState["sslMode"]) ??
      POSTGRES_DEFAULT_STATE.sslMode,
  };
}

function deriveConnectionString(
  metadata: Record<string, unknown>,
  fallback: PostgresFormState
) {
  if (typeof metadata.connectionString === "string") {
    return metadata.connectionString;
  }

  if (fallback.host && fallback.database && fallback.username) {
    return buildConnectionString(fallback);
  }

  return "";
}

function buildConnectionString(state: PostgresFormState) {
  const user = encodeURIComponent(state.username || "");
  const password = state.password
    ? `:${encodeURIComponent(state.password)}`
    : "";
  const schema = state.schema
    ? `?schema=${encodeURIComponent(state.schema)}`
    : "";
  return `postgresql://${user}${password}@${state.host}:${state.port}/${state.database}${schema}`;
}

function parseConnectionString(input: string): PostgresFormState | null {
  try {
    const url = new URL(input);
    if (!url.protocol.startsWith("postgres")) {
      return null;
    }
    return {
      host: url.hostname ?? "",
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, ""),
      username: decodeURIComponent(url.username ?? ""),
      password: decodeURIComponent(url.password ?? ""),
      schema: url.searchParams.get("schema") ?? "",
      sslMode: "prefer",
    };
  } catch {
    return null;
  }
}




