"use client";

/**
 * The editable draft of one email template, plus debounced autosave.
 *
 * Both panes of the editor read and write through this, which is what makes
 * selecting a block on the canvas and selecting it in the left list the same
 * operation. Autosave follows the page builder's proven shape
 * (`components/pages/page-screen.tsx`), including the `skipNextSave` guard that
 * stops the save-on-load that a naive effect would fire.
 */

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useRef, useState } from "react";
import { extractTokenKeys, labelFromTokenKey } from "@/lib/comms/tokens";
import type {
  EmailBlock,
  EmailBlockType,
  EmailTemplateStatus,
  EmailTemplateVariable,
} from "@/lib/comms/types";
import { createBlock, duplicateBlock } from "../canvas/block-meta";

const AUTOSAVE_DELAY_MS = 900;

export interface EmailTemplateDraft {
  blocks: EmailBlock[];
  description: string;
  name: string;
  previewText: string;
  sampleData: Record<string, string>;
  slug: string;
  status: EmailTemplateStatus;
  subject: string;
  variables: EmailTemplateVariable[];
}

export type SaveState = "error" | "idle" | "saved" | "saving";

export interface UseEmailTemplateDraftOptions {
  loaded: EmailTemplateDraft | null;
  onSave: (draft: EmailTemplateDraft) => Promise<void>;
}

export function useEmailTemplateDraft({
  loaded,
  onSave,
}: UseEmailTemplateDraftOptions) {
  const [draft, setDraft] = useState<EmailTemplateDraft | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const skipNextSave = useRef(true);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  // Adopt the server copy on load, and on any refetch that lands while we have
  // no local edits pending.
  useEffect(() => {
    if (!loaded) {
      return;
    }
    setDraft((current) => {
      if (current) {
        return current;
      }
      setSelectedBlockId(loaded.blocks[0]?.id ?? null);
      return loaded;
    });
  }, [loaded]);

  const patch = useCallback((changes: Partial<EmailTemplateDraft>) => {
    setDraft((current) => (current ? { ...current, ...changes } : current));
  }, []);

  const saveNow = useCallback(async () => {
    const current = draft;
    if (!current) {
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    try {
      await onSaveRef.current(current);
      setSaveState("saved");
    } catch (caught) {
      setSaveState("error");
      setSaveError(caught instanceof Error ? caught.message : "Save failed");
    }
  }, [draft]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void saveNow();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, saveNow]);

  /* ---------------------------------------------------------------------- */
  /* Block operations                                                        */
  /* ---------------------------------------------------------------------- */

  const changeBlock = useCallback(
    (id: string, blockPatch: Partial<EmailBlock>) => {
      setDraft((current) =>
        current
          ? {
              ...current,
              blocks: current.blocks.map((block) =>
                block.id === id
                  ? ({ ...block, ...blockPatch } as EmailBlock)
                  : block
              ),
            }
          : current
      );
    },
    []
  );

  const insertBlock = useCallback((type: EmailBlockType, index: number) => {
    const block = createBlock(type);
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const blocks = [...current.blocks];
      blocks.splice(index, 0, block);
      return { ...current, blocks };
    });
    setSelectedBlockId(block.id);
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            blocks: current.blocks.filter((block) => block.id !== id),
          }
        : current
    );
    setSelectedBlockId((current) => (current === id ? null : current));
  }, []);

  const duplicate = useCallback((id: string) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const index = current.blocks.findIndex((block) => block.id === id);
      const source = current.blocks[index];
      if (!source) {
        return current;
      }
      const copy = duplicateBlock(source);
      const blocks = [...current.blocks];
      blocks.splice(index + 1, 0, copy);
      setSelectedBlockId(copy.id);
      return { ...current, blocks };
    });
  }, []);

  const moveBlock = useCallback((from: number, to: number) => {
    setDraft((current) => {
      if (!current || to < 0 || to >= current.blocks.length) {
        return current;
      }
      return { ...current, blocks: arrayMove(current.blocks, from, to) };
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Variables                                                               */
  /* ---------------------------------------------------------------------- */

  const upsertVariable = useCallback(
    (variable: EmailTemplateVariable, atIndex?: number) => {
      setDraft((current) => {
        if (!current) {
          return current;
        }
        const variables = [...current.variables];
        const existing =
          atIndex ?? variables.findIndex((item) => item.key === variable.key);
        if (existing >= 0) {
          variables[existing] = variable;
        } else {
          variables.push(variable);
        }
        return { ...current, variables };
      });
    },
    []
  );

  const removeVariable = useCallback((key: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            variables: current.variables.filter((item) => item.key !== key),
          }
        : current
    );
  }, []);

  /**
   * Used by `TokenField`'s "＋ New variable" item. Async because the prop is
   * typed for implementations that need to prompt; this one decides locally.
   */
  const declareVariable = useCallback(
    (draftKey: string): Promise<EmailTemplateVariable | null> => {
      const variable: EmailTemplateVariable = {
        key: draftKey,
        label: labelFromTokenKey(draftKey),
        required: true,
        type: draftKey.toLowerCase().endsWith("url") ? "url" : "string",
      };
      upsertVariable(variable);
      return Promise.resolve(variable);
    },
    [upsertVariable]
  );

  return {
    changeBlock,
    declareVariable,
    deleteBlock,
    draft,
    duplicate,
    insertBlock,
    moveBlock,
    patch,
    removeVariable,
    saveError,
    saveNow,
    saveState,
    selectedBlockId,
    setSelectedBlockId,
    upsertVariable,
  };
}

/** Every `{{key}}` used anywhere in the template, in reading order. */
export function usedTokenKeys(draft: EmailTemplateDraft): string[] {
  const sources: string[] = [draft.subject, draft.previewText];
  for (const block of draft.blocks) {
    switch (block.type) {
      case "header":
        sources.push(block.title ?? "", block.logoUrl ?? "");
        break;
      case "heading":
      case "text":
      case "footer":
        sources.push(block.text);
        break;
      case "button":
        sources.push(block.label, block.url);
        break;
      case "image":
        sources.push(block.src, block.alt ?? "");
        break;
      default:
        break;
    }
  }

  const keys: string[] = [];
  for (const source of sources) {
    for (const key of extractTokenKeys(source)) {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    }
  }
  return keys;
}

/** Tokens the template uses that nothing has declared. */
export function undeclaredTokenKeys(draft: EmailTemplateDraft): string[] {
  const declared = new Set(draft.variables.map((variable) => variable.key));
  return usedTokenKeys(draft).filter((key) => !declared.has(key));
}
