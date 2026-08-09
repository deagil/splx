"use client";

/**
 * The editor's top bar: identity, save state, go-live readiness, and sending.
 *
 * Nothing here blocks authoring. Sender identity still lives in Workspace
 * Settings → Email, but it is surfaced at the two moments it actually matters —
 * the readiness checklist and the test-send popover, which can configure it
 * inline rather than bouncing you to another page mid-draft.
 */

import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronLeftIcon,
  CopyIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EmailTemplateStatus } from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import type { SaveState } from "./hooks/use-email-template-draft";

export interface ReadinessCheck {
  action?: { label: string; onClick: () => void };
  label: string;
  ok: boolean;
}

export interface EmailSettingsDraft {
  fromEmail: string;
  fromName: string;
  replyTo: string;
}

export interface EditorHeaderProps {
  checks: ReadinessCheck[];
  name: string;
  onDelete: () => void;
  onDuplicate: () => void;
  onNameChange: (next: string) => void;
  onSaveSettings: (settings: EmailSettingsDraft) => Promise<void>;
  onStatusChange: (status: EmailTemplateStatus) => void;
  onTestSend: (to: string) => Promise<void>;
  saveError: string | null;
  saveState: SaveState;
  senderConfigured: boolean;
  settings: EmailSettingsDraft;
  status: EmailTemplateStatus;
}

export function EditorHeader({
  checks,
  name,
  onDelete,
  onDuplicate,
  onNameChange,
  onSaveSettings,
  onStatusChange,
  onTestSend,
  saveError,
  saveState,
  senderConfigured,
  settings,
  status,
}: EditorHeaderProps) {
  const blockers = checks.filter((check) => !check.ok);
  const canActivate = blockers.length === 0;

  return (
    <header className="flex shrink-0 items-center gap-2 border-border border-b px-3 py-2">
      <Button asChild size="sm" type="button" variant="ghost">
        <Link href="/comms/templates">
          <ChevronLeftIcon className="size-4" />
          Templates
        </Link>
      </Button>

      <input
        aria-label="Template name"
        className="min-w-0 max-w-64 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-medium text-sm outline-none transition-colors hover:border-input focus:border-ring focus:ring-[3px] focus:ring-ring/30"
        onChange={(event) => onNameChange(event.target.value)}
        value={name}
      />

      <StatusControl
        canActivate={canActivate}
        onChange={onStatusChange}
        status={status}
      />

      <ReadinessPopover blockers={blockers} checks={checks} />

      <div className="ml-auto flex items-center gap-2">
        <SaveIndicator error={saveError} state={saveState} />
        <TestSendPopover
          onSaveSettings={onSaveSettings}
          onTestSend={onTestSend}
          senderConfigured={senderConfigured}
          settings={settings}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More actions"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            type="button"
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDuplicate}>
              <CopyIcon className="size-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2Icon className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function StatusControl({
  canActivate,
  onChange,
  status,
}: {
  canActivate: boolean;
  onChange: (status: EmailTemplateStatus) => void;
  status: EmailTemplateStatus;
}) {
  const active = status === "active";
  return (
    <button
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border text-muted-foreground hover:bg-accent",
        !(canActivate || active) && "cursor-not-allowed opacity-60"
      )}
      disabled={!(canActivate || active)}
      onClick={() => onChange(active ? "draft" : "active")}
      title={
        canActivate || active
          ? "Only active templates can be selected in workflows"
          : "Resolve the go-live checks first"
      }
      type="button"
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-muted-foreground/50"
        )}
      />
      {active ? "Active" : "Draft"}
    </button>
  );
}

function ReadinessPopover({
  blockers,
  checks,
}: {
  blockers: ReadinessCheck[];
  checks: ReadinessCheck[];
}) {
  if (blockers.length === 0) {
    return null;
  }
  return (
    <Popover>
      <PopoverTrigger
        className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-700 text-xs transition-colors hover:bg-amber-500/20 dark:text-amber-300"
        type="button"
      >
        <AlertTriangleIcon className="size-3" />
        {blockers.length} before this can go live
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3" side="bottom">
        <p className="mb-2 font-medium text-sm">Before this can go live</p>
        <ul className="space-y-2">
          {checks.map((check) => (
            <li className="flex items-start gap-2 text-sm" key={check.label}>
              {check.ok ? (
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              )}
              <span
                className={cn(
                  "min-w-0 flex-1",
                  check.ok && "text-muted-foreground"
                )}
              >
                {check.label}
              </span>
              {!check.ok && check.action ? (
                <button
                  className="shrink-0 text-primary text-xs underline-offset-2 hover:underline"
                  onClick={check.action.onClick}
                  type="button"
                >
                  {check.action.label}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function SaveIndicator({
  error,
  state,
}: {
  error: string | null;
  state: SaveState;
}) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Loader2Icon className="size-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span
        className="flex items-center gap-1.5 text-destructive text-xs"
        title={error ?? undefined}
      >
        <AlertTriangleIcon className="size-3.5" />
        Save failed
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <CheckIcon className="size-3.5" />
        Saved
      </span>
    );
  }
  return null;
}

function TestSendPopover({
  onSaveSettings,
  onTestSend,
  senderConfigured,
  settings,
}: {
  onSaveSettings: (settings: EmailSettingsDraft) => Promise<void>;
  onTestSend: (to: string) => Promise<void>;
  senderConfigured: boolean;
  settings: EmailSettingsDraft;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (!senderConfigured) {
        await onSaveSettings(draft);
      }
      await onTestSend(to);
      setMessage(`Sent to ${to}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Test send failed");
    } finally {
      setBusy(false);
    }
  };

  const ready = senderConfigured
    ? to.length > 0
    : to.length > 0 && draft.fromEmail.length > 0;

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(settings);
          setMessage(null);
        }
      }}
      open={open}
    >
      <PopoverTrigger
        className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-sm transition-colors hover:bg-accent"
        type="button"
      >
        <SendIcon className="size-3.5" />
        Test send
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-3" side="bottom">
        <p className="font-medium text-sm">Send a test</p>

        {senderConfigured ? null : (
          <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
            <p className="flex items-center gap-1.5 text-amber-700 text-xs dark:text-amber-300">
              <AlertTriangleIcon className="size-3.5 shrink-0" />
              No sender address configured yet
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="test-from-name">
                From name
              </Label>
              <Input
                id="test-from-name"
                onChange={(event) =>
                  setDraft({ ...draft, fromName: event.target.value })
                }
                placeholder="Acme"
                value={draft.fromName}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="test-from-email">
                From email
              </Label>
              <Input
                id="test-from-email"
                onChange={(event) =>
                  setDraft({ ...draft, fromEmail: event.target.value })
                }
                placeholder="hello@acme.com"
                type="email"
                value={draft.fromEmail}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="test-to">
            Send to
          </Label>
          <Input
            id="test-to"
            onChange={(event) => setTo(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={to}
          />
        </div>

        <p className="text-muted-foreground text-xs">
          Uses this template's sample values.
        </p>

        {message ? (
          <p className="text-muted-foreground text-xs">{message}</p>
        ) : null}

        <Button
          className="w-full"
          disabled={busy || !ready}
          onClick={send}
          size="sm"
          type="button"
        >
          {busy
            ? "Sending…"
            : senderConfigured
              ? "Send test"
              : "Save & send test"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function StatusBadge({ status }: { status: EmailTemplateStatus }) {
  return (
    <Badge variant={status === "active" ? "primary" : "secondary"}>
      {status}
    </Badge>
  );
}
