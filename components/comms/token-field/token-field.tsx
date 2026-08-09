"use client";

/**
 * A contenteditable field that edits a plain string containing `{{key}}` merge
 * tokens, rendering each token as a chip showing the variable's human label.
 *
 * Two variants, one component:
 * - `variant="input"` looks like a normal form input (left config panel).
 * - `variant="inline"` inherits the surrounding email typography and shows only
 *   a hover ring, so it can sit directly on the editable canvas without
 *   changing a single box metric of the rendered email.
 *
 * See `token-dom.ts` for the DOM invariants this relies on.
 */

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { PlusIcon } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  filterVariables,
  slugifyToTokenKey,
  variablesFingerprint,
  variablesToMap,
} from "@/lib/comms/tokens";
import type { EmailTemplateVariable } from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import {
  autoTokenizeTextNodes,
  buildTokenFragment,
  caretToStringOffset,
  chipAfterCaret,
  chipBeforeCaret,
  htmlToPlainText,
  insertLineBreak,
  insertTokenChip,
  placeCaretAfter,
  renderTokenDom,
  restoreCaretAtStringOffset,
  serializeTokenDom,
} from "./token-dom";
import { useTokenMenu } from "./use-token-menu";

const CREATE_ITEM = "__create__";

export interface TokenFieldProps {
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  multiline?: boolean;
  onChange: (next: string) => void;
  /** Declares a variable mid-sentence; resolves to null if the user cancels. */
  onCreateVariable?: (
    draftKey: string
  ) => Promise<EmailTemplateVariable | null>;
  /** Enter in a single-line field. Defaults to blurring. */
  onSubmit?: () => void;
  placeholder?: string;
  style?: CSSProperties;
  value: string;
  variables: EmailTemplateVariable[];
  variant?: "inline" | "input";
}

export function TokenField({
  className,
  disabled = false,
  id,
  multiline = false,
  onChange,
  onCreateVariable,
  onSubmit,
  placeholder,
  style,
  value,
  variables,
  variant = "input",
  ...rest
}: TokenFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  /** The string the DOM currently holds. Written on every emit AND every paint. */
  const lastSerializedRef = useRef<string | null>(null);
  const lastPaintedVarsRef = useRef<string | null>(null);
  const composingRef = useRef(false);
  const pendingRepaintRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const [isEmpty, setIsEmpty] = useState(value.length === 0);

  const listboxId = useId();
  const menu = useTokenMenu();

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  const varsFingerprint = useMemo(
    () => variablesFingerprint(variables),
    [variables]
  );
  // Keyed off the fingerprint, not the array identity: a parent that rebuilds
  // `variables` every render must not force a repaint on every keystroke.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fingerprint is the value-equality key for `variables`
  const variableMap = useMemo(
    () => variablesToMap(variables),
    [varsFingerprint]
  );

  const emit = useCallback(() => {
    const root = rootRef.current;
    if (!root || composingRef.current) {
      return;
    }
    const next = serializeTokenDom(root);
    // Set BEFORE onChange. The parent re-renders with `value === next`, the
    // paint effect's equality check passes, the DOM is left alone and the caret
    // never moves. This is the whole anti-clobber mechanism.
    lastSerializedRef.current = next;
    setIsEmpty(next.length === 0);
    onChangeRef.current(next);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    if (composingRef.current) {
      pendingRepaintRef.current = true;
      return;
    }
    if (
      value === lastSerializedRef.current &&
      varsFingerprint === lastPaintedVarsRef.current
    ) {
      return;
    }

    const focused = document.activeElement === root;
    const caret = focused ? caretToStringOffset(root) : null;

    renderTokenDom(root, value, variableMap, { multiline });
    lastSerializedRef.current = value;
    lastPaintedVarsRef.current = varsFingerprint;
    setIsEmpty(value.length === 0);

    if (caret !== null) {
      restoreCaretAtStringOffset(root, caret);
    }
  }, [value, varsFingerprint, variableMap, multiline]);

  // The caret can leave the trigger without an input event (click, arrows).
  useEffect(() => {
    if (!menu.open) {
      return;
    }
    const handle = () => {
      const root = rootRef.current;
      if (root && document.activeElement === root) {
        menu.refresh(root);
      }
    };
    document.addEventListener("selectionchange", handle);
    return () => document.removeEventListener("selectionchange", handle);
  }, [menu]);

  const matches = useMemo(
    () => filterVariables(variables, menu.query),
    [variables, menu.query]
  );
  const draftKey = slugifyToTokenKey(menu.query);
  const canCreate = Boolean(onCreateVariable) && draftKey.length > 0;
  const itemCount = matches.length + (canCreate ? 1 : 0);
  const activeIndex = Math.min(menu.activeIndex, Math.max(itemCount - 1, 0));

  const applySelection = useCallback(
    async (index: number) => {
      const root = rootRef.current;
      const range = menu.rangeRef.current;
      if (!(root && range)) {
        return;
      }

      const chosen = matches[index];
      if (chosen) {
        menu.close();
        insertTokenChip(range, chosen.key, chosen);
        emit();
        return;
      }

      if (!(canCreate && onCreateVariable)) {
        return;
      }
      // Snapshot before awaiting: the dialog steals focus, and the live range
      // would be invalidated by anything that touches the DOM meanwhile.
      const snapshot = range.cloneRange();
      menu.close();
      const created = await onCreateVariable(draftKey);
      root.focus();

      if (!created) {
        // Cancelled — leave the typed `{{query` alone and put the caret back.
        if (root.contains(snapshot.startContainer)) {
          snapshot.collapse(false);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(snapshot);
        }
        return;
      }

      if (root.contains(snapshot.startContainer)) {
        insertTokenChip(snapshot, created.key, created);
      } else {
        const fragment = buildTokenFragment(`{{${created.key}}}`, variableMap, {
          multiline,
        });
        const last = fragment.lastChild;
        root.append(fragment);
        if (last) {
          placeCaretAfter(last);
        }
      }
      emit();
    },
    [
      canCreate,
      draftKey,
      emit,
      matches,
      menu,
      multiline,
      onCreateVariable,
      variableMap,
    ]
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // IME first, always: during kana conversion Enter commits the candidate and
    // must never reach the menu.
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return;
    }

    if (menu.open && itemCount > 0) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          menu.setActiveIndex((activeIndex + 1) % itemCount);
          return;
        case "ArrowUp":
          event.preventDefault();
          menu.setActiveIndex((activeIndex - 1 + itemCount) % itemCount);
          return;
        case "Enter":
        case "Tab":
          event.preventDefault();
          void applySelection(activeIndex);
          return;
        case "Escape":
          event.preventDefault();
          menu.close();
          return;
        default:
          break;
      }
    }

    const selection = window.getSelection();
    const range =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (range && (event.key === "Backspace" || event.key === "Delete")) {
      if (!range.collapsed) {
        // Let the browser delete the selection, but make sure a partially
        // covered chip goes whole rather than leaving a mangled shell.
        const nodes = range
          .cloneContents()
          .querySelectorAll("[data-token-chip]");
        if (nodes.length === 0) {
          return;
        }
      }
      const chip =
        event.key === "Backspace"
          ? chipBeforeCaret(range)
          : chipAfterCaret(range);
      if (chip) {
        event.preventDefault();
        chip.remove();
        emit();
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (multiline) {
        insertLineBreak();
        emit();
        return;
      }
      if (onSubmit) {
        onSubmit();
      } else {
        rootRef.current?.blur();
      }
      return;
    }

    if (event.key === "Escape") {
      rootRef.current?.blur();
    }
  };

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root || composingRef.current) {
      return;
    }
    const native = event.nativeEvent as InputEvent;
    // Cheap gate: only worth scanning when a token could have just been closed.
    if (
      native.data === "}" ||
      native.inputType?.startsWith("insertFromPaste") ||
      native.inputType?.startsWith("insertFromDrop")
    ) {
      autoTokenizeTextNodes(root, variableMap);
    }
    emit();
    menu.refresh(root);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw =
      event.clipboardData.getData("text/plain") ||
      htmlToPlainText(event.clipboardData.getData("text/html"));

    let text = raw.replace(/\r\n?/g, "\n").replace(/[\u200b\u00ad]/g, "");
    if (!multiline) {
      text = text.replace(/\s*\n\s*/g, " ");
    }
    if (!text) {
      return;
    }

    const selection = window.getSelection();
    const range =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range) {
      return;
    }
    const fragment = buildTokenFragment(text, variableMap, { multiline });
    const last = fragment.lastChild;
    range.deleteContents();
    range.insertNode(fragment);
    if (last) {
      placeCaretAfter(last);
    }
    emit();
  };

  const isInput = variant === "input";
  // Spans, not divs, for the inline variant: it renders inside <h1>/<p>-shaped
  // parents on the canvas, where a block-level child would be invalid HTML.
  const Wrapper = isInput ? "div" : "span";
  const Editable = isInput ? "div" : "span";

  return (
    <Wrapper
      className={cn(
        "relative",
        !isInput && "block",
        isInput &&
          "min-h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-foreground text-sm shadow-black/5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
        // Ring + negative margin, never border or padding: the hover affordance
        // must not shift a single pixel of the email it sits on top of.
        !isInput &&
          "-mx-1 rounded-[3px] px-1 ring-1 ring-transparent transition-[box-shadow] duration-150 focus-within:ring-2 focus-within:ring-ring/40 hover:ring-border/70",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      {isEmpty && placeholder ? (
        // A sibling span, not `:empty::before` — Safari renders the caret after
        // a pseudo-element, and `:empty` fails as soon as the browser leaves a
        // stray <br> behind.
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute select-none text-muted-foreground/70",
            isInput ? "inset-x-3 top-1.5" : "inset-x-1 top-0"
          )}
        >
          {placeholder}
        </span>
      ) : null}

      <Editable
        aria-activedescendant={
          menu.open && itemCount > 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        aria-controls={menu.open ? listboxId : undefined}
        aria-expanded={menu.open}
        aria-haspopup="listbox"
        aria-label={rest["aria-label"]}
        className={cn(
          "relative block outline-none",
          multiline ? "whitespace-pre-wrap" : "whitespace-pre",
          !multiline && "overflow-x-auto"
        )}
        contentEditable={!disabled}
        id={id}
        onBlur={() => menu.close()}
        onCompositionEnd={() => {
          composingRef.current = false;
          if (pendingRepaintRef.current) {
            pendingRepaintRef.current = false;
            lastPaintedVarsRef.current = null;
          }
          const root = rootRef.current;
          if (root) {
            autoTokenizeTextNodes(root, variableMap);
            emit();
            menu.refresh(root);
          }
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onDrop={(event) => event.preventDefault()}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        ref={rootRef}
        role="combobox"
        style={style}
        suppressContentEditableWarning
      />

      <PopoverPrimitive.Root
        onOpenChange={(next) => {
          if (!next) {
            menu.close();
          }
        }}
        open={menu.open && itemCount > 0}
      >
        <PopoverPrimitive.Portal keepMounted>
          <PopoverPrimitive.Positioner
            align="start"
            anchor={{ getBoundingClientRect: menu.getAnchorRect }}
            className="isolate z-50"
            side="bottom"
            sideOffset={6}
          >
            <PopoverPrimitive.Popup
              className="max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-black/5 shadow-md outline-hidden"
              // Focus must stay in the contenteditable, or the DOM selection —
              // and with it the replace range — is lost the moment we open.
              finalFocus={false}
              id={listboxId}
              initialFocus={false}
              role="listbox"
            >
              {matches.map((variable, index) => (
                <TokenMenuItem
                  active={index === activeIndex}
                  description={variable.key}
                  id={`${listboxId}-${index}`}
                  key={variable.key}
                  label={variable.label}
                  onHover={() => menu.setActiveIndex(index)}
                  onSelect={() => void applySelection(index)}
                  typeLabel={variable.type}
                />
              ))}
              {canCreate ? (
                <TokenMenuItem
                  active={activeIndex === matches.length}
                  description={draftKey}
                  icon={<PlusIcon className="size-3.5" />}
                  id={`${listboxId}-${matches.length}`}
                  key={CREATE_ITEM}
                  label="New variable"
                  onHover={() => menu.setActiveIndex(matches.length)}
                  onSelect={() => void applySelection(matches.length)}
                />
              ) : null}
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </Wrapper>
  );
}

function TokenMenuItem({
  active,
  description,
  icon,
  id,
  label,
  onHover,
  onSelect,
  typeLabel,
}: {
  active: boolean;
  description: string;
  icon?: React.ReactNode;
  id: string;
  label: string;
  onHover: () => void;
  onSelect: () => void;
  typeLabel?: string;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-foreground"
      )}
      id={id}
      onClick={onSelect}
      // Never let the menu take focus away from the editable div.
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={onHover}
      role="option"
      type="button"
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] text-primary uppercase">
        {icon ?? (typeLabel ?? "s").slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 truncate font-mono text-muted-foreground text-xs">
        {description}
      </span>
    </button>
  );
}
