"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  getComposerSkillIcon,
  getComposerSkillIconSvg,
} from "@/components/agent/lib/composer-skill-icons";
import {
  type ComposerSkill,
  filterComposerSkills,
} from "@/components/agent/lib/composer-skills";
import { cn } from "@/lib/utils";

const CHIP_ATTR = "data-skill-chip";
const REF_CHIP_ATTR = "data-ref-chip";

/**
 * Reference chips are the `@` mention mechanism. Agent C's menu that produced
 * them was a closed `"drive" | "notion"` union hitting its own API and did not
 * come over; splx mentions get wired onto this same DOM contract later (see
 * docs/EVE_AGENT_PORT.md §8.1). The serialisation below is deliberately kept so
 * that when the menu lands, the composer already reads and expands its chips.
 */
function isRefChip(node: Node | null): node is HTMLElement {
  return (
    node instanceof HTMLElement && node.getAttribute(REF_CHIP_ATTR) === "true"
  );
}

/** Expand a ref chip DOM node to the marker the agent sees. */
function serializeRefChip(node: HTMLElement): string {
  const marker = node.dataset.marker?.trim();
  if (marker) {
    return marker;
  }
  const name = node.dataset.name;
  return name ? `@${name}` : "";
}

/** Inline orange text colour for skill mentions (matches Agent C accent). */
export const SKILL_MENTION_COLOR = "text-orange-600 dark:text-orange-400";

/** Stagger between characters for the insert wave (ms). */
const SKILL_INSERT_CHAR_STAGGER_MS = 28;
/** Duration of each character's wave/warp animation (ms). */
const SKILL_INSERT_CHAR_DURATION_MS = 780;

export type SlashMenuState = {
  query: string;
  /** Absolute left of the caret relative to the composer card. */
  left: number;
  /** Absolute top of the caret relative to the composer card (menu opens above). */
  top: number;
};

type SlashMatch = {
  query: string;
  /** Range covering `/` + query text to replace. */
  range: Range;
};

function isSkillChip(node: Node | null): node is HTMLElement {
  return node instanceof HTMLElement && node.getAttribute(CHIP_ATTR) === "true";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Skill mention: true inline text (not flex) so it shares the editor baseline
 * and does not inflate line height when typed after.
 */
export function createSkillChipElement(
  skill: ComposerSkill,
  options?: { animate?: boolean }
): HTMLSpanElement {
  const mention = document.createElement("span");
  mention.setAttribute(CHIP_ATTR, "true");
  mention.contentEditable = "false";
  mention.dataset.skillId = skill.id;
  mention.dataset.prompt = skill.prompt;
  mention.className = cn(
    "skill-mention max-w-full whitespace-nowrap",
    "font-normal text-base",
    SKILL_MENTION_COLOR,
    "cursor-pointer select-none"
  );
  mention.setAttribute("title", skill.prompt);
  mention.setAttribute("role", "button");
  mention.tabIndex = 0;

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.className = cn(
    "skill-mention-icon mr-1 inline-block size-[1em] align-[-0.125em]",
    SKILL_MENTION_COLOR
  );
  icon.innerHTML = getComposerSkillIconSvg(skill.icon);
  const svg = icon.querySelector("svg");
  if (svg) {
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("class", "block size-full");
  }

  const label = document.createElement("span");
  label.className = "skill-mention-label";
  // Always split into chars so spacing matches during and after the warp.
  fillSkillLabelChars(label, skill.label);

  mention.append(icon, label);

  if (options?.animate && !prefersReducedMotion()) {
    playSkillInsertAnimation(mention, skill.label.length);
  }

  return mention;
}

/** One span per character — kept permanently so kerning never snaps. */
function fillSkillLabelChars(label: HTMLSpanElement, plainLabel: string) {
  label.replaceChildren();
  Array.from(plainLabel).forEach((char, index) => {
    const span = document.createElement("span");
    span.className = "skill-mention-char";
    span.style.setProperty("--i", String(index));
    span.textContent = char === " " ? "\u00a0" : char;
    label.append(span);
  });
}

/** Orange highlight + per-character up/down warp on insert. */
function playSkillInsertAnimation(mention: HTMLSpanElement, charCount: number) {
  mention.dataset.inserting = "true";

  const settleMs =
    SKILL_INSERT_CHAR_DURATION_MS +
    Math.max(0, charCount - 1) * SKILL_INSERT_CHAR_STAGGER_MS;

  window.setTimeout(() => {
    if (!mention.isConnected) {
      return;
    }
    delete mention.dataset.inserting;
  }, settleMs);
}

/** Walk the editor and expand skill chips to their prompt text. */
export function serializeComposerContent(root: HTMLElement): string {
  const parts: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push((node.textContent ?? "").replace(/\u00a0/g, " "));
      return;
    }
    if (isSkillChip(node)) {
      const prompt = node.dataset.prompt?.trim();
      if (prompt) {
        parts.push(prompt);
        // Ensure a space after the expanded prompt when more content follows.
        parts.push(" ");
      }
      return;
    }
    if (isRefChip(node)) {
      const marker = serializeRefChip(node).trim();
      if (marker) {
        parts.push(marker);
        parts.push(" ");
      }
      return;
    }
    if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        parts.push("\n");
        return;
      }
      if (
        (node.tagName === "DIV" || node.tagName === "P") &&
        parts.length > 0 &&
        !parts.at(-1)?.endsWith("\n")
      ) {
        parts.push("\n");
      }
      for (const child of node.childNodes) {
        walk(child);
      }
    }
  };

  for (const child of root.childNodes) {
    walk(child);
  }

  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function composerHasContent(root: HTMLElement | null): boolean {
  if (!root) {
    return false;
  }
  if (root.querySelector(`[${CHIP_ATTR}="true"]`)) {
    return true;
  }
  if (root.querySelector(`[${REF_CHIP_ATTR}="true"]`)) {
    return true;
  }
  // Browsers often leave a lone <br> in an "empty" contenteditable.
  const text = (root.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\n/g, "")
    .trim();
  return text.length > 0;
}

export function clearComposerContent(root: HTMLElement) {
  root.innerHTML = "";
}

export function setComposerPlainText(root: HTMLElement, text: string) {
  root.textContent = text;
  // Place caret at end
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Find `/query` immediately before the caret inside `root`. */
export function findSlashMatch(root: HTMLElement): SlashMatch | null {
  const selection = window.getSelection();
  if (!selection || !selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const caret = selection.getRangeAt(0);
  if (!root.contains(caret.startContainer)) {
    return null;
  }
  if (caret.startContainer.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const textNode = caret.startContainer as Text;
  const full = textNode.textContent ?? "";
  const before = full.slice(0, caret.startOffset);
  const match = before.match(/(?:^|[\s\u00a0])(\/[^\s\u00a0]*)$/);
  if (!match?.[1]) {
    return null;
  }

  const token = match[1];
  const start = caret.startOffset - token.length;
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, caret.startOffset);

  return {
    query: token.slice(1),
    range,
  };
}

export function insertSkillChip(
  root: HTMLElement,
  skill: ComposerSkill,
  replaceRange: Range
) {
  replaceRange.deleteContents();

  const chip = createSkillChipElement(skill, { animate: true });
  replaceRange.insertNode(chip);

  const space = document.createTextNode("\u00a0");
  chip.after(space);

  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const after = document.createRange();
  after.setStart(space, space.length);
  after.collapse(true);
  selection.removeAllRanges();
  selection.addRange(after);

  root.focus();
}

type SkillSlashMenuProps = {
  open: boolean;
  query: string;
  skills: ComposerSkill[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (skill: ComposerSkill) => void;
  style?: CSSProperties;
};

export function SkillSlashMenu({
  open,
  query,
  skills,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  style,
}: SkillSlashMenuProps) {
  if (!open) {
    return null;
  }

  const activeSkill = skills[activeIndex] ?? null;

  return (
    <div className="absolute z-50" style={style}>
      <div className="relative w-56">
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-black/8 bg-popover p-1",
            "text-popover-foreground shadow-lg dark:border-white/10"
          )}
          role="listbox"
        >
          <div className="px-2 py-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
            Skills{query ? ` · /${query}` : ""}
          </div>
          {skills.length === 0 ? (
            <div className="px-2 py-3 text-muted-foreground text-sm">
              No matching skills
            </div>
          ) : (
            skills.map((skill, index) => {
              const active = index === activeIndex;
              const Icon = getComposerSkillIcon(skill.icon);
              return (
                <button
                  aria-describedby={
                    active ? "skill-slash-explainer" : undefined
                  }
                  aria-selected={active}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                    "outline-none transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/70"
                  )}
                  key={skill.id}
                  onClick={() => onSelect(skill)}
                  onMouseDown={(event) => {
                    // Prevent editor blur before click applies.
                    event.preventDefault();
                  }}
                  onMouseEnter={() => onActiveIndexChange(index)}
                  role="option"
                  type="button"
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      "text-orange-600 dark:text-orange-400"
                    )}
                  />
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {skill.id}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {activeSkill ? (
          <div className="absolute top-0 left-[calc(100%+0.5rem)]">
            <SkillExplainer skill={activeSkill} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SkillExplainer({ skill }: { skill: ComposerSkill }) {
  const Icon = getComposerSkillIcon(skill.icon);
  return (
    <div
      className={cn(
        "w-56 rounded-xl border border-black/8 bg-popover p-3",
        "text-popover-foreground shadow-lg dark:border-white/10"
      )}
      id="skill-slash-explainer"
      role="tooltip"
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            "text-orange-600 dark:text-orange-400"
          )}
        />
        <div className="min-w-0">
          <div className="font-medium text-foreground text-sm">
            {skill.label}
          </div>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            {skill.description}
          </p>
        </div>
      </div>
    </div>
  );
}

type UseSkillSlashMenuArgs = {
  editorRef: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  onContentChange: () => void;
};

export function useSkillSlashMenu({
  editorRef,
  containerRef,
  disabled,
  onContentChange,
}: UseSkillSlashMenuArgs) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ bottom: 56, left: 8 });
  const replaceRangeRef = useRef<Range | null>(null);

  const skills = filterComposerSkills(query);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    replaceRangeRef.current = null;
  }, []);

  const placeMenu = useCallback((matchRange: Range, container: HTMLElement) => {
    const rect = matchRange.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    // Skills list is w-56; explainer is out of flow so it doesn't affect layout.
    const panelWidth = 224;
    setMenuPos({
      bottom: containerRect.bottom - rect.top + 8,
      left: Math.max(
        8,
        Math.min(
          rect.left - containerRect.left,
          containerRect.width - panelWidth
        )
      ),
    });
  }, []);

  const refresh = useCallback(() => {
    if (disabled) {
      close();
      return;
    }
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) {
      close();
      return;
    }

    const match = findSlashMatch(editor);
    if (!match) {
      close();
      return;
    }

    replaceRangeRef.current = match.range.cloneRange();
    setQuery(match.query);
    setOpen(true);
    placeMenu(match.range, container);
  }, [close, containerRef, disabled, editorRef, placeMenu]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    // Keep position fresh after layout shifts from typing.
    const match = editorRef.current ? findSlashMatch(editorRef.current) : null;
    const container = containerRef.current;
    if (!match || !container) {
      return;
    }
    placeMenu(match.range, container);
  }, [containerRef, editorRef, open, placeMenu, query]);

  const selectSkill = useCallback(
    (skill: ComposerSkill) => {
      const editor = editorRef.current;
      const range = replaceRangeRef.current;
      if (!editor || !range) {
        return;
      }
      insertSkillChip(editor, skill, range);
      close();
      onContentChange();
    },
    [close, editorRef, onContentChange]
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!open) {
        return false;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (skills.length === 0) {
          return true;
        }
        setActiveIndex((i) => (i + 1) % skills.length);
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (skills.length === 0) {
          return true;
        }
        setActiveIndex((i) => (i - 1 + skills.length) % skills.length);
        return true;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        const skill = skills[activeIndex];
        if (skill) {
          event.preventDefault();
          selectSkill(skill);
          return true;
        }
      }

      if (event.key === "Tab") {
        const skill = skills[activeIndex];
        if (skill) {
          event.preventDefault();
          selectSkill(skill);
          return true;
        }
      }

      return false;
    },
    [activeIndex, close, open, selectSkill, skills]
  );

  return {
    activeIndex,
    close,
    menuPos,
    onKeyDown,
    open,
    query,
    refresh,
    selectSkill,
    setActiveIndex,
    skills,
  };
}
