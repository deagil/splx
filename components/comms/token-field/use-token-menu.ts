"use client";

/**
 * The `{{` trigger and its caret-anchored menu state.
 *
 * Adapted from the agent composer's slash menu
 * (`components/agent/ui/composer-skill-chips.tsx`), with three differences the
 * `{{` case forces:
 *
 * 1. The trigger is two characters and may start mid-word, so there is no
 *    word-boundary guard.
 * 2. The user may type the closing `}}` themselves, so the replace range has to
 *    swallow it (and `autoTokenizeTextNodes` handles the case where they type it
 *    faster than the menu can react).
 * 3. Positioning is delegated to Base UI's Popover via a virtual anchor instead
 *    of hand-computed offsets — this field renders inside two different scroll
 *    containers, so it needs real collision detection and portalling.
 */

import { useCallback, useRef, useState } from "react";

/**
 * Query charset excludes braces and newlines: `{{{` re-anchors on the last
 * `{{`, and typing the first `}` closes the menu so auto-tokenizing takes over.
 * Spaces are allowed so the query can match a human label like "first name".
 */
const TOKEN_TRIGGER_RE = /\{\{([^{}\n]*)$/;

export interface TokenTriggerMatch {
  query: string;
  range: Range;
}

/** Finds an open `{{…` immediately before the caret, if there is one. */
export function findTokenTrigger(root: HTMLElement): TokenTriggerMatch | null {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  const caret = selection.getRangeAt(0);
  const node = caret.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) {
    return null;
  }

  const text = node.textContent ?? "";
  const match = TOKEN_TRIGGER_RE.exec(text.slice(0, caret.startOffset));
  if (!match) {
    return null;
  }

  const start = caret.startOffset - match[0].length;
  // Swallow a `}}` the user already typed so selecting an item doesn't strand it.
  const end =
    text.slice(caret.startOffset, caret.startOffset + 2) === "}}"
      ? caret.startOffset + 2
      : caret.startOffset;

  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return { query: match[1] ?? "", range };
}

export interface TokenMenuState {
  activeIndex: number;
  close: () => void;
  /** Virtual anchor for `Popover.Positioner`; tracks the caret as you type. */
  getAnchorRect: () => DOMRect;
  open: boolean;
  query: string;
  /** The live range covering `{{query`, for replacement on select. */
  rangeRef: React.RefObject<Range | null>;
  refresh: (root: HTMLElement) => void;
  setActiveIndex: (index: number) => void;
}

const EMPTY_RECT = () => new DOMRect(0, 0, 0, 0);

export function useTokenMenu(): TokenMenuState {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rangeRef = useRef<Range | null>(null);
  /**
   * Set when the user dismisses the menu with Escape. Keeps it shut until they
   * change the query, so Escape doesn't reopen on the very next keystroke.
   */
  const suppressedQueryRef = useRef<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    suppressedQueryRef.current = query;
  }, [query]);

  const refresh = useCallback((root: HTMLElement) => {
    const match = findTokenTrigger(root);
    if (!match) {
      rangeRef.current = null;
      suppressedQueryRef.current = null;
      setOpen(false);
      return;
    }
    if (suppressedQueryRef.current === match.query) {
      rangeRef.current = match.range;
      return;
    }
    suppressedQueryRef.current = null;
    rangeRef.current = match.range;
    setQuery((current) => {
      if (current !== match.query) {
        setActiveIndex(0);
      }
      return match.query;
    });
    setOpen(true);
  }, []);

  const getAnchorRect = useCallback(
    () => rangeRef.current?.getBoundingClientRect() ?? EMPTY_RECT(),
    []
  );

  return {
    activeIndex,
    close,
    getAnchorRect,
    open,
    query,
    rangeRef,
    refresh,
    setActiveIndex,
  };
}
