/**
 * DOM plumbing for `TokenField`. No React — everything here operates directly on
 * a contenteditable subtree so React never owns those nodes and can never
 * clobber the caret.
 *
 * ## The invariant everything else depends on
 *
 * The editable subtree is always an alternating sequence:
 *
 *     text, chip, text, chip, … text
 *
 * with zero-width-space-only text nodes filling any gap, so there is always a
 * text node before the first chip and after the last. That single rule is what
 * makes the caret placeable before a leading chip in Safari, stops Firefox's
 * backspace from deleting a chip's *inner text* instead of the chip, and gives
 * every insertion an unambiguous landing spot.
 *
 * The filler is ZWSP (`\u200b`), not the NBSP used by the agent composer's
 * chips — an NBSP would silently append a real space to the field's value.
 */

import { parseTokenString } from "@/lib/comms/tokens";
import type { EmailTemplateVariable } from "@/lib/comms/types";
import { cn } from "@/lib/utils";

export const ZWSP = "\u200b";
export const TOKEN_CHIP_ATTR = "data-token-chip";

const CHIP_BASE_CLASS =
  "inline rounded-[3px] px-[0.25em] py-[0.05em] align-baseline font-medium text-[0.9em] leading-[inherit] [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [-webkit-user-modify:read-only] select-none";
const CHIP_KNOWN_CLASS = "bg-primary/12 text-primary ring-1 ring-primary/25";
const CHIP_UNKNOWN_CLASS =
  "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/40 dark:text-amber-300";

export function isTokenChip(
  node: Node | null | undefined
): node is HTMLElement {
  return node instanceof HTMLElement && node.hasAttribute(TOKEN_CHIP_ATTR);
}

export function createTokenChipElement(
  key: string,
  variable: EmailTemplateVariable | undefined
): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.setAttribute(TOKEN_CHIP_ATTR, "");
  chip.setAttribute("contenteditable", "false");
  chip.dataset.tokenKey = key;
  chip.className = cn(
    CHIP_BASE_CLASS,
    variable ? CHIP_KNOWN_CLASS : CHIP_UNKNOWN_CLASS
  );
  chip.textContent = variable ? variable.label : key;

  if (variable) {
    chip.title = `${variable.label} — {{${key}}}`;
  } else {
    chip.dataset.tokenUnknown = "true";
    chip.title = `{{${key}}} is not declared as a template variable`;
  }
  return chip;
}

/** Builds the alternating text/chip fragment described in the module header. */
export function buildTokenFragment(
  value: string,
  variables: Map<string, EmailTemplateVariable>,
  options: { multiline: boolean }
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const segments = parseTokenString(value);
  let needsTextNode = true;

  const pushText = (text: string) => {
    if (!options.multiline) {
      fragment.append(document.createTextNode(text));
      return;
    }
    // `\n` round-trips as <br>; the renderer's text style is `pre-wrap`, so the
    // canvas and the delivered email break lines in the same places.
    const lines = text.split("\n");
    for (const [index, line] of lines.entries()) {
      if (index > 0) {
        fragment.append(document.createElement("br"));
      }
      fragment.append(document.createTextNode(line));
    }
  };

  for (const segment of segments) {
    if (segment.type === "text") {
      pushText(segment.text);
      needsTextNode = false;
      continue;
    }
    if (needsTextNode) {
      fragment.append(document.createTextNode(ZWSP));
    }
    fragment.append(
      createTokenChipElement(segment.key, variables.get(segment.key))
    );
    // Always leave somewhere to put the caret after a chip.
    fragment.append(document.createTextNode(ZWSP));
    needsTextNode = false;
  }

  if (!fragment.firstChild) {
    fragment.append(document.createTextNode(""));
  }
  return fragment;
}

export function renderTokenDom(
  root: HTMLElement,
  value: string,
  variables: Map<string, EmailTemplateVariable>,
  options: { multiline: boolean }
): void {
  root.replaceChildren(buildTokenFragment(value, variables, options));
}

/**
 * Reads the editable subtree back out as a stored string.
 *
 * Deliberately does NOT trim or collapse whitespace: this value is bound live,
 * so eating a trailing space would make the parent echo back a different string,
 * force a repaint, and jump the caret mid-word.
 */
export function serializeTokenDom(root: HTMLElement): string {
  const parts: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(
        (node.textContent ?? "")
          // contenteditable inserts NBSP for held-down spaces.
          .replaceAll("\u00a0", " ")
          .replaceAll(ZWSP, "")
      );
      return;
    }
    if (isTokenChip(node)) {
      // Read the key from the dataset, never from textContent — the chip shows a
      // human label, and Firefox lets a determined user mangle its inner nodes.
      parts.push(`{{${node.dataset.tokenKey ?? ""}}}`);
      return;
    }
    if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        parts.push("\n");
        return;
      }
      // Chrome wraps pasted or Enter-split content in DIV/P despite our
      // preventDefault()s; treat those as line breaks rather than losing them.
      if (
        (node.tagName === "DIV" || node.tagName === "P") &&
        parts.length > 0 &&
        !parts.at(-1)?.endsWith("\n")
      ) {
        parts.push("\n");
      }
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    }
  };

  for (const child of Array.from(root.childNodes)) {
    walk(child);
  }
  return parts.join("");
}

/* -------------------------------------------------------------------------- */
/* Caret                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Caret position expressed as an index into `serializeTokenDom(root)`.
 *
 * String space rather than DOM space, because a repaint rebuilds the node tree
 * entirely. Chips count as their full `{{key}}` width so the caret can never
 * land inside one.
 */
export function caretToStringOffset(root: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) {
    return null;
  }

  let offset = 0;
  let found = false;

  const walk = (node: Node) => {
    if (found) {
      return;
    }
    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += (node.textContent ?? "")
          .slice(0, range.startOffset)
          .replaceAll(ZWSP, "").length;
      } else {
        // Element container: count the children the caret sits after.
        const children = Array.from(node.childNodes).slice(
          0,
          range.startOffset
        );
        for (const child of children) {
          walk(child);
        }
      }
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent ?? "").replaceAll(ZWSP, "").length;
      return;
    }
    if (isTokenChip(node)) {
      offset += `{{${node.dataset.tokenKey ?? ""}}}`.length;
      return;
    }
    if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        offset += 1;
        return;
      }
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    }
  };

  for (const child of Array.from(root.childNodes)) {
    walk(child);
  }
  return found ? offset : null;
}

export function placeCaret(node: Node, offset: number): void {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function placeCaretAfter(node: Node): void {
  const parent = node.parentNode;
  if (!parent) {
    return;
  }
  const next = node.nextSibling;
  if (next?.nodeType === Node.TEXT_NODE) {
    placeCaret(next, Math.min(1, next.textContent?.length ?? 0));
    return;
  }
  const filler = document.createTextNode(ZWSP);
  parent.insertBefore(filler, next);
  placeCaret(filler, 1);
}

/** Inverse of {@link caretToStringOffset}; clamps into the nearest text node. */
export function restoreCaretAtStringOffset(
  root: HTMLElement,
  target: number
): void {
  let remaining = target;
  let lastTextNode: Text | null = null;

  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      lastTextNode = text;
      const raw = text.textContent ?? "";
      const visibleLength = raw.replaceAll(ZWSP, "").length;
      if (remaining <= visibleLength) {
        // Map the ZWSP-free offset back onto the raw text node.
        let seen = 0;
        for (let index = 0; index <= raw.length; index += 1) {
          if (seen === remaining) {
            placeCaret(text, index);
            return true;
          }
          if (raw[index] !== ZWSP) {
            seen += 1;
          }
        }
        placeCaret(text, raw.length);
        return true;
      }
      remaining -= visibleLength;
      return false;
    }
    if (isTokenChip(node)) {
      const width = `{{${node.dataset.tokenKey ?? ""}}}`.length;
      if (remaining < width) {
        // Never inside a chip — snap to just after it.
        placeCaretAfter(node);
        return true;
      }
      remaining -= width;
      return false;
    }
    if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        if (remaining < 1) {
          placeCaretAfter(node);
          return true;
        }
        remaining -= 1;
        return false;
      }
      for (const child of Array.from(node.childNodes)) {
        if (walk(child)) {
          return true;
        }
      }
    }
    return false;
  };

  for (const child of Array.from(root.childNodes)) {
    if (walk(child)) {
      return;
    }
  }

  if (lastTextNode) {
    const text = lastTextNode as Text;
    placeCaret(text, text.textContent?.length ?? 0);
    return;
  }
  placeCaret(root, root.childNodes.length);
}

/* -------------------------------------------------------------------------- */
/* Editing operations                                                          */
/* -------------------------------------------------------------------------- */

function previousChipSkippingFiller(node: Node): HTMLElement | null {
  let cursor: Node | null = node.previousSibling;
  while (cursor) {
    if (isTokenChip(cursor)) {
      return cursor;
    }
    const isFiller =
      cursor.nodeType === Node.TEXT_NODE &&
      (cursor.textContent ?? "").replaceAll(ZWSP, "").length === 0;
    if (!isFiller) {
      return null;
    }
    cursor = cursor.previousSibling;
  }
  return null;
}

function nextChipSkippingFiller(node: Node): HTMLElement | null {
  let cursor: Node | null = node.nextSibling;
  while (cursor) {
    if (isTokenChip(cursor)) {
      return cursor;
    }
    const isFiller =
      cursor.nodeType === Node.TEXT_NODE &&
      (cursor.textContent ?? "").replaceAll(ZWSP, "").length === 0;
    if (!isFiller) {
      return null;
    }
    cursor = cursor.nextSibling;
  }
  return null;
}

/** The chip a Backspace at the caret should delete whole, if any. */
export function chipBeforeCaret(range: Range): HTMLElement | null {
  if (!range.collapsed) {
    return null;
  }
  const { startContainer: node, startOffset } = range;
  if (node.nodeType === Node.TEXT_NODE) {
    const before = (node.textContent ?? "")
      .slice(0, startOffset)
      .replaceAll(ZWSP, "");
    if (before.length > 0) {
      return null;
    }
    return previousChipSkippingFiller(node);
  }
  const child = node.childNodes[startOffset - 1] ?? null;
  return isTokenChip(child) ? child : null;
}

/** The chip a Delete at the caret should remove whole, if any. */
export function chipAfterCaret(range: Range): HTMLElement | null {
  if (!range.collapsed) {
    return null;
  }
  const { startContainer: node, startOffset } = range;
  if (node.nodeType === Node.TEXT_NODE) {
    const after = (node.textContent ?? "")
      .slice(startOffset)
      .replaceAll(ZWSP, "");
    if (after.length > 0) {
      return null;
    }
    return nextChipSkippingFiller(node);
  }
  const child = node.childNodes[startOffset] ?? null;
  return isTokenChip(child) ? child : null;
}

/** Replaces `range` with a chip, leaving the caret just after it. */
export function insertTokenChip(
  range: Range,
  key: string,
  variable: EmailTemplateVariable | undefined
): void {
  const chip = createTokenChipElement(key, variable);
  range.deleteContents();
  range.insertNode(chip);

  if (!chip.previousSibling) {
    chip.parentNode?.insertBefore(document.createTextNode(ZWSP), chip);
  }
  placeCaretAfter(chip);
}

/**
 * Turns hand-typed or pasted `{{key}}` runs into chips.
 *
 * Cheap to call because the caller gates it on the user having typed `}` or
 * pasted. Returns true when it mutated, so the caller can re-place the caret.
 */
export function autoTokenizeTextNodes(
  root: HTMLElement,
  variables: Map<string, EmailTemplateVariable>
): boolean {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const candidates: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if ((current.textContent ?? "").includes("}}")) {
      candidates.push(current as Text);
    }
    current = walker.nextNode();
  }
  if (candidates.length === 0) {
    return false;
  }

  let mutated = false;
  for (const textNode of candidates) {
    const text = textNode.textContent ?? "";
    const segments = parseTokenString(text.replaceAll(ZWSP, ""));
    if (!segments.some((segment) => segment.type === "token")) {
      continue;
    }

    const fragment = document.createDocumentFragment();
    let needsLeadingFiller = true;
    for (const segment of segments) {
      if (segment.type === "text") {
        fragment.append(document.createTextNode(segment.text));
        needsLeadingFiller = false;
        continue;
      }
      if (needsLeadingFiller) {
        fragment.append(document.createTextNode(ZWSP));
      }
      fragment.append(
        createTokenChipElement(segment.key, variables.get(segment.key))
      );
      fragment.append(document.createTextNode(ZWSP));
      needsLeadingFiller = false;
    }

    const lastNode = fragment.lastChild;
    textNode.parentNode?.replaceChild(fragment, textNode);
    if (lastNode) {
      placeCaretAfter(lastNode);
    }
    mutated = true;
  }
  return mutated;
}

/**
 * Hand-rolled line break: letting the browser handle Enter produces `<div>`
 * wrappers that the serializer then has to guess at.
 */
export function insertLineBreak(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const br = document.createElement("br");
  range.insertNode(br);
  // A trailing <br> renders as nothing without a following node.
  const filler = document.createTextNode(ZWSP);
  br.after(filler);
  placeCaret(filler, 1);
}

/** Strips markup from clipboard HTML without ever touching a live element. */
export function htmlToPlainText(html: string): string {
  if (!html) {
    return "";
  }
  // DOMParser is inert: no script execution, no resource loads. Never assign
  // clipboard HTML to a live element's innerHTML.
  return (
    new DOMParser().parseFromString(html, "text/html").body.textContent ?? ""
  );
}
