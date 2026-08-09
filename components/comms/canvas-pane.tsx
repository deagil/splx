"use client";

/**
 * The right-hand pane: subject line, the canvas, and the view controls.
 *
 * Three views:
 * - **Edit**    the editable canvas
 * - **Preview** the same client renderer with tokens merged against sample
 *               values — instant, no server round trip
 * - **Text**    the plain-text alternative the send actually carries
 *
 * The server "true render" is an explicit toggle rather than a live panel. The
 * old editor re-fetched it on a 400ms debounce after every keystroke, costing a
 * DB read plus a full `@react-email/render` for a pane nobody was looking at.
 * Now it fetches on entry, on demand, and (debounced) only while visible.
 */

import {
  Loader2Icon,
  MonitorIcon,
  RefreshCwIcon,
  SmartphoneIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  EmailBlock,
  EmailBlockType,
  EmailTemplateVariable,
} from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import { EmailCanvas } from "./canvas/email-canvas";
import { TokenField } from "./token-field/token-field";

const TRUE_RENDER_DEBOUNCE_MS = 600;

export type CanvasView = "edit" | "preview" | "text";

export interface RenderedPreview {
  html: string;
  subject: string;
  text: string;
}

export interface CanvasPaneProps {
  blocks: EmailBlock[];
  onChangeBlock: (id: string, patch: Partial<EmailBlock>) => void;
  onChangeSubject: (next: string) => void;
  onCreateVariable?: (
    draftKey: string
  ) => Promise<EmailTemplateVariable | null>;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onInsertBlock: (type: EmailBlockType, index: number) => void;
  onMoveBlock: (from: number, to: number) => void;
  onSelectBlock: (id: string | null) => void;
  /** Fetches the real server render. */
  requestTrueRender: () => Promise<RenderedPreview>;
  sampleValues: Record<string, string>;
  selectedBlockId: string | null;
  subject: string;
  variables: EmailTemplateVariable[];
}

export function CanvasPane({
  blocks,
  onChangeBlock,
  onChangeSubject,
  onCreateVariable,
  onDeleteBlock,
  onDuplicateBlock,
  onInsertBlock,
  onMoveBlock,
  onSelectBlock,
  requestTrueRender,
  sampleValues,
  selectedBlockId,
  subject,
  variables,
}: CanvasPaneProps) {
  const [view, setView] = useState<CanvasView>("edit");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [rendered, setRendered] = useState<RenderedPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(requestTrueRender);
  useEffect(() => {
    requestRef.current = requestTrueRender;
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRendered(await requestRef.current());
    } catch {
      setRendered(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const needsServer = view === "text";

  // Only debounce-refetch while the server render is actually on screen. The
  // draft deps are intentional triggers, not values read in the body — `refresh`
  // reads the current draft through `requestRef`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: blocks/subject/variables/sampleValues are change triggers
  useEffect(() => {
    if (!needsServer) {
      return;
    }
    const timer = setTimeout(() => {
      void refresh();
    }, TRUE_RENDER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [needsServer, refresh, blocks, subject, variables, sampleValues]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-border border-b px-4 py-2">
        <span className="shrink-0 text-muted-foreground text-xs">Subject</span>
        <div className="min-w-0 flex-1">
          <TokenField
            aria-label="Email subject"
            className="border-transparent bg-transparent shadow-none"
            onChange={onChangeSubject}
            onCreateVariable={onCreateVariable}
            placeholder="Subject line — type {{ to insert data"
            value={subject}
            variables={variables}
          />
        </div>
      </div>

      {view === "text" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-6">
          {loading && !rendered ? (
            <p className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2Icon className="size-4 animate-spin" />
              Rendering…
            </p>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {rendered?.text || "Nothing to show yet."}
            </pre>
          )}
        </div>
      ) : (
        <EmailCanvas
          blocks={blocks}
          device={device}
          mode={view === "preview" ? "preview" : "edit"}
          onChangeBlock={onChangeBlock}
          onCreateVariable={onCreateVariable}
          onDeleteBlock={onDeleteBlock}
          onDuplicateBlock={onDuplicateBlock}
          onInsertBlock={onInsertBlock}
          onMoveBlock={onMoveBlock}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
          values={sampleValues}
          variables={variables}
        />
      )}

      <div className="flex shrink-0 items-center justify-between gap-2 border-border border-t px-4 py-2">
        <Segmented
          onChange={(next) => setView(next as CanvasView)}
          options={[
            { label: "Edit", value: "edit" },
            { label: "Preview", value: "preview" },
            { label: "Text", value: "text" },
          ]}
          value={view}
        />

        <div className="flex items-center gap-2">
          {view === "text" ? (
            <button
              aria-label="Refresh render"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => void refresh()}
              type="button"
            >
              <RefreshCwIcon
                className={cn("size-3.5", loading && "animate-spin")}
              />
            </button>
          ) : (
            <Segmented
              onChange={(next) => setDevice(next as "desktop" | "mobile")}
              options={[
                {
                  icon: <MonitorIcon className="size-3.5" />,
                  label: "Desktop",
                  value: "desktop",
                },
                {
                  icon: <SmartphoneIcon className="size-3.5" />,
                  label: "Mobile",
                  value: "mobile",
                },
              ]}
              value={device}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Segmented({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: { icon?: React.ReactNode; label: string; value: string }[];
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5">
      {options.map((option) => (
        <button
          aria-label={option.label}
          aria-pressed={value === option.value}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.icon}
          {option.icon ? null : option.label}
        </button>
      ))}
    </div>
  );
}
