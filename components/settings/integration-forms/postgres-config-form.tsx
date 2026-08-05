"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import type { AppMode } from "@/lib/app-mode";
import { cn } from "@/lib/utils";

const leadingSlashRegex = /^\//;

interface PostgresFormState {
  database: string;
  host: string;
  password: string;
  port: string;
  schema: string;
  sslMode: "prefer" | "require" | "disable";
  username: string;
}

const POSTGRES_DEFAULT_STATE: PostgresFormState = {
  database: "",
  host: "",
  password: "",
  port: "5432",
  schema: "",
  sslMode: "prefer",
  username: "",
};

interface PostgresConfigFormProps {
  className?: string;
  metadata?: Record<string, unknown>;
  mode: AppMode;
  onCancel?: () => void;
  onSuccess?: () => void;
}

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
  const [connectionStringError, setConnectionStringError] = useState<
    string | null
  >(null);
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
        database: form.database.trim(),
        host: form.host.trim(),
        password: form.password ? form.password : undefined,
        port: Number.parseInt(form.port, 10) || 5432,
        schema: form.schema.trim() || undefined,
        sslMode: form.sslMode,
        username: form.username.trim(),
      };

      const response = await fetch("/api/workspace-apps/postgres", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
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
          onChange={(event) => handleConnectionStringChange(event.target.value)}
          placeholder="postgresql://user:pass@host:5432/db"
          spellCheck={false}
          value={connectionString}
        />
        {connectionStringError ? (
          <p className="text-destructive text-xs">{connectionStringError}</p>
        ) : (
          <FieldDescription>
            This is written directly to your{" "}
            {mode === "local" ? ".env.local file" : "workspace connection"}.
          </FieldDescription>
        )}
      </Field>

      <div>
        <button
          aria-expanded={showAdvanced}
          className="font-medium text-blue-700 text-sm transition hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => setShowAdvanced((prev) => !prev)}
          type="button"
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
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, host: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                  placeholder="db.example.com"
                  required
                  value={form.host}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pg-port">Port</FieldLabel>
                <Input
                  id="pg-port"
                  inputMode="numeric"
                  name="pg-port"
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, port: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                  pattern="[0-9]*"
                  value={form.port}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pg-database">Database</FieldLabel>
                <Input
                  id="pg-database"
                  name="pg-database"
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, database: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                  placeholder="splx"
                  required
                  value={form.database}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pg-schema">Schema (optional)</FieldLabel>
                <Input
                  id="pg-schema"
                  name="pg-schema"
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, schema: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                  placeholder="public"
                  value={form.schema}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pg-username">Username</FieldLabel>
                <Input
                  id="pg-username"
                  name="pg-username"
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, username: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                  placeholder="workspace_user"
                  required
                  value={form.username}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pg-password">Password</FieldLabel>
                <Input
                  id="pg-password"
                  name="pg-password"
                  onChange={(event) => {
                    setDirty(true);
                    const next = { ...form, password: event.target.value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                  placeholder="••••••••"
                  type="password"
                  value={form.password}
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
                  onValueChange={(value: PostgresFormState["sslMode"]) => {
                    setDirty(true);
                    const next = { ...form, sslMode: value };
                    setForm(next);
                    setConnectionString(buildConnectionString(next));
                  }}
                  value={form.sslMode}
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
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
        ) : (
          <Button
            disabled={saving}
            onClick={() => {
              setDirty(false);
              const resetState = derivePostgresState(metadata);
              setForm(resetState);
              setConnectionString(
                deriveConnectionString(metadata ?? {}, resetState)
              );
              setConnectionStringError(null);
            }}
            type="button"
            variant="ghost"
          >
            Reset
          </Button>
        )}
        <Button
          disabled={saving || !dirty || Boolean(connectionStringError)}
          type="submit"
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
    database: (metadata.database as string) ?? "",
    host: (metadata.host as string) ?? "",
    password: "",
    port: metadata.port ? String(metadata.port) : POSTGRES_DEFAULT_STATE.port,
    schema: (metadata.schema as string) ?? "",
    sslMode:
      (metadata.sslMode as PostgresFormState["sslMode"]) ??
      POSTGRES_DEFAULT_STATE.sslMode,
    username: (metadata.username as string) ?? "",
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
      database: url.pathname.replace(leadingSlashRegex, ""),
      host: url.hostname ?? "",
      password: decodeURIComponent(url.password ?? ""),
      port: url.port || "5432",
      schema: url.searchParams.get("schema") ?? "",
      sslMode: "prefer",
      username: decodeURIComponent(url.username ?? ""),
    };
  } catch {
    return null;
  }
}
