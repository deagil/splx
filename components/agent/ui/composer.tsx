"use client";

import type { ChatStatus } from "ai";
import { ArrowUpIcon, MicIcon, SquareIcon, XIcon } from "lucide-react";
import {
  type ClipboardEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSpeechDictation } from "@/components/agent/hooks/use-speech-dictation";
import {
  clearComposerContent,
  composerHasContent,
  SkillSlashMenu,
  serializeComposerContent,
  setComposerPlainText,
  useSkillSlashMenu,
} from "@/components/agent/ui/composer-skill-chips";
import { cn } from "@/lib/utils";

/** Prepared for file-attachment UI (not rendered yet). */
export type UploadedFile = {
  id: string;
  name: string;
  type: string;
  url: string;
  description?: string;
  isUploading?: boolean;
};

/** @deprecated Prefer shared/composer-skills — kept for API compatibility. */
export type ComposerTool = {
  name: string;
  category: string;
  description?: string;
  icon?: ReactNode;
};

/** Prepared for the plus-button context menu (not rendered yet). */
export type ComposerContextOption = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export type ComposerProps = {
  /**
   * Static placeholder. When omitted, the empty composer rotates through
   * built-in hints (skills, connectors, general prompts).
   */
  placeholder?: string;
  onSubmit?: (message: string, files?: UploadedFile[]) => void;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  maxRows?: number;
  defaultValue?: string;
  /** When set, resets the editor to this plain text (chips are not preserved). */
  value?: string;
  className?: string;
  /** Reserved for upcoming attachment chips. */
  attachedFiles?: UploadedFile[];
  onRemoveFile?: (id: string) => void;
  /** @deprecated Slash skills are built-in; prop ignored. */
  tools?: ComposerTool[];
  onToolSelect?: (tool: ComposerTool) => void;
  showToolsButton?: boolean;
  /** Reserved for upcoming plus-button menu. */
  contextOptions?: ComposerContextOption[];
  onAttachClick?: () => void;
  status?: ChatStatus;
  onStop?: () => void;
};

const LINE_HEIGHT_PX = 24;

/** Rotating empty-state hints when no static `placeholder` prop is passed. */
const COMPOSER_PLACEHOLDERS = [
  "What would you like to know?",
  "Type / for skills…",
  "Ask about a table or a page…",
  "Summarise what's on this page…",
  "What changed in this workspace recently?",
] as const;

const PLACEHOLDER_ROTATE_MS = 4200;
const PLACEHOLDER_FADE_MS = 220;

function useRotatingPlaceholder(enabled: boolean): {
  text: string;
  fading: boolean;
} {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setFading(false);
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let fadeTimeout: number | undefined;

    const id = window.setInterval(() => {
      if (reduceMotion) {
        setIndex((i) => (i + 1) % COMPOSER_PLACEHOLDERS.length);
        return;
      }
      setFading(true);
      fadeTimeout = window.setTimeout(() => {
        setIndex((i) => (i + 1) % COMPOSER_PLACEHOLDERS.length);
        setFading(false);
      }, PLACEHOLDER_FADE_MS);
    }, PLACEHOLDER_ROTATE_MS);

    return () => {
      window.clearInterval(id);
      if (fadeTimeout !== undefined) {
        window.clearTimeout(fadeTimeout);
      }
    };
  }, [enabled]);

  return {
    fading,
    text: COMPOSER_PLACEHOLDERS[index] ?? COMPOSER_PLACEHOLDERS[0],
  };
}

export function Composer({
  placeholder,
  onSubmit,
  onChange,
  disabled = false,
  autoFocus = false,
  maxRows = 8,
  defaultValue = "",
  value,
  className,
  attachedFiles = [],
  status,
  onStop,
}: ComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!defaultValue.trim());
  const canSubmit = !isEmpty || attachedFiles.length > 0;

  const isGenerating = status === "submitted" || status === "streaming";
  const editorDisabled = disabled || isGenerating;

  const rotatePlaceholders = placeholder === undefined;
  const rotating = useRotatingPlaceholder(rotatePlaceholders && isEmpty);
  const activePlaceholder =
    placeholder ?? rotating.text ?? "What would you like to know?";
  const ariaLabel = placeholder ?? "What would you like to know?";

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    setIsEmpty(!composerHasContent(editor));
    onChange?.(serializeComposerContent(editor));
  }, [onChange]);

  const syncLocalEmpty = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    setIsEmpty(!composerHasContent(editor));
  }, []);

  const slash = useSkillSlashMenu({
    containerRef: cardRef,
    disabled: editorDisabled,
    editorRef,
    onContentChange: emitChange,
  });

  const getBaseText = useCallback(() => {
    const editor = editorRef.current;
    return editor ? serializeComposerContent(editor) : "";
  }, []);

  const setPlainValue = useCallback(
    (next: string) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      setComposerPlainText(editor, next);
      emitChange();
      slash.refresh();
    },
    [emitChange, slash.refresh]
  );

  const {
    supported: dictationSupported,
    listening: isDictating,
    error: dictationError,
    stop: stopDictation,
    toggle: toggleDictation,
  } = useSpeechDictation({
    disabled: editorDisabled,
    getBaseText,
    onTranscript: setPlainValue,
  });

  const resizeEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.style.height = "0px";
    const maxHeight = LINE_HEIGHT_PX * maxRows;
    const nextHeight = Math.min(
      Math.max(editor.scrollHeight, LINE_HEIGHT_PX),
      maxHeight
    );
    editor.style.height = `${nextHeight}px`;
  }, [maxRows]);

  useEffect(() => {
    resizeEditor();
  }, [isEmpty, resizeEditor]);

  useEffect(() => {
    if (autoFocus) {
      editorRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (defaultValue && editorRef.current && !editorRef.current.textContent) {
      setComposerPlainText(editorRef.current, defaultValue);
      syncLocalEmpty();
    }
    // Only seed once from defaultValue.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount seed
  }, []);

  useEffect(() => {
    if (value === undefined) {
      return;
    }
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const current = serializeComposerContent(editor);
    if (current === value) {
      return;
    }
    setComposerPlainText(editor, value);
    syncLocalEmpty();
  }, [syncLocalEmpty, value]);

  const handleInput = useCallback(() => {
    if (isDictating) {
      stopDictation();
    }
    emitChange();
    resizeEditor();
    slash.refresh();
  }, [emitChange, isDictating, resizeEditor, slash.refresh, stopDictation]);

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (editorDisabled) {
        return;
      }

      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const message = serializeComposerContent(editor);
      if (!message && attachedFiles.length === 0) {
        return;
      }

      stopDictation();
      onSubmit?.(message, attachedFiles);

      if (value === undefined) {
        clearComposerContent(editor);
        emitChange();
        resizeEditor();
        slash.close();
      }
    },
    [
      attachedFiles,
      editorDisabled,
      emitChange,
      onSubmit,
      resizeEditor,
      slash.close,
      stopDictation,
      value,
    ]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (slash.onKeyDown(event)) {
        return;
      }

      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }
      if (isComposing || event.nativeEvent.isComposing) {
        return;
      }

      event.preventDefault();
      handleSubmit();
    },
    [handleSubmit, isComposing, slash.onKeyDown]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      if (!text) {
        return;
      }
      document.execCommand("insertText", false, text);
      emitChange();
      resizeEditor();
      slash.refresh();
    },
    [emitChange, resizeEditor, slash.refresh]
  );

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  let sendIcon = <ArrowUpIcon className="size-4" />;
  if (status === "submitted" || status === "streaming") {
    sendIcon = <SquareIcon className="size-3.5 fill-current" />;
  } else if (status === "error") {
    sendIcon = <XIcon className="size-4" />;
  }

  const menuStyle: CSSProperties = {
    bottom: slash.menuPos.bottom,
    left: slash.menuPos.left,
  };

  return (
    <form className={cn("w-full", className)} onSubmit={handleSubmit}>
      <div
        className={cn(
          "relative rounded-3xl border border-border/80 bg-card px-4 pt-3 pb-3 outline-none",
          "dark:border-border dark:bg-card",
          "shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]",
          "transition-shadow duration-200",
          "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.1)]",
          "focus-within:border-border/80 focus-within:outline-none focus-within:ring-0",
          "focus-within:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.1)]"
        )}
        ref={cardRef}
      >
        <SkillSlashMenu
          activeIndex={slash.activeIndex}
          onActiveIndexChange={slash.setActiveIndex}
          onSelect={slash.selectSkill}
          open={slash.open}
          query={slash.query}
          skills={slash.skills}
          style={menuStyle}
        />

        <div className="relative">
          {isEmpty ? (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 text-base text-muted-foreground/70 leading-6",
                "transition-opacity duration-200 ease-out",
                !isDictating && rotatePlaceholders && rotating.fading
                  ? "opacity-0"
                  : "opacity-100"
              )}
            >
              {isDictating ? "Listening…" : activePlaceholder}
            </div>
          ) : null}
          <div
            aria-label={ariaLabel}
            aria-multiline="true"
            className={cn(
              "relative w-full resize-none bg-transparent text-base leading-6",
              "text-foreground focus:outline-none",
              "min-h-6 whitespace-pre-wrap break-words",
              editorDisabled && "pointer-events-none opacity-50"
            )}
            contentEditable={!editorDisabled}
            data-slot="composer-editor"
            onCompositionEnd={() => setIsComposing(false)}
            onCompositionStart={() => setIsComposing(true)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            ref={editorRef}
            role="textbox"
            style={{
              maxHeight: `${LINE_HEIGHT_PX * maxRows}px`,
              overflowY: "auto",
            }}
            suppressContentEditableWarning
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <div className="flex shrink-0 items-center gap-0.5">
            {dictationSupported ? (
              <button
                aria-label={isDictating ? "Stop dictation" : "Start dictation"}
                aria-pressed={isDictating}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-colors",
                  isDictating
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  editorDisabled && "cursor-not-allowed opacity-50"
                )}
                disabled={editorDisabled}
                onClick={toggleDictation}
                title={
                  dictationError ?? (isDictating ? "Stop dictation" : "Dictate")
                }
                type="button"
              >
                <MicIcon
                  className={cn("size-4", isDictating && "animate-pulse")}
                />
              </button>
            ) : null}

            <button
              aria-label={isGenerating ? "Stop" : "Send message"}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                isGenerating
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : canSubmit && !disabled
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-muted text-muted-foreground",
                (disabled || (!canSubmit && !isGenerating)) &&
                  "cursor-not-allowed"
              )}
              disabled={disabled || (!isGenerating && !canSubmit)}
              onClick={isGenerating && onStop ? handleStop : undefined}
              type={isGenerating && onStop ? "button" : "submit"}
            >
              {sendIcon}
            </button>
          </div>
        </div>
      </div>

      {dictationError ? (
        <p
          className="mt-2 max-w-prose px-1 text-destructive text-xs"
          role="alert"
        >
          {dictationError}
        </p>
      ) : null}
    </form>
  );
}
