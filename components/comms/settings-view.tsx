"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailSettings {
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? "Request failed");
  }
  return body;
};

export function CommsSettingsView() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/email-settings",
    fetcher
  );
  const loaded = data?.data?.settings as EmailSettings | undefined;

  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    setFromName(loaded.fromName ?? "");
    setFromEmail(loaded.fromEmail ?? "");
    setReplyTo(loaded.replyTo ?? "");
  }, [loaded]);

  const save = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch("/api/v1/email-settings", {
        body: JSON.stringify({
          fromEmail: fromEmail || null,
          fromName: fromName || null,
          replyTo: replyTo || null,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to save settings");
      }
      await mutate();
      setMessage("Saved");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {error instanceof Error ? error.message : "Failed to load settings"}
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="from-name">From name</Label>
        <Input
          id="from-name"
          onChange={(event) => setFromName(event.target.value)}
          placeholder="Acme Support"
          value={fromName}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="from-email">From email</Label>
        <Input
          id="from-email"
          onChange={(event) => setFromEmail(event.target.value)}
          placeholder="support@example.com"
          type="email"
          value={fromEmail}
        />
        <p className="text-muted-foreground text-xs">
          Must be a verified domain in your email provider (Resend).
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reply-to">Reply-to (optional)</Label>
        <Input
          id="reply-to"
          onChange={(event) => setReplyTo(event.target.value)}
          placeholder="hello@example.com"
          type="email"
          value={replyTo}
        />
      </div>
      <Button disabled={saving} onClick={save} type="button">
        Save settings
      </Button>
      {message ? (
        <p className="text-muted-foreground text-sm">{message}</p>
      ) : null}
    </div>
  );
}
