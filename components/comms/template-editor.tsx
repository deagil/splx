"use client";

/**
 * The email template editor.
 *
 * Full-height, non-scrolling split: a tabbed config panel on the left, the
 * editable email on the right. The page itself never scrolls — only the panel
 * body and the canvas do — so the email stays in view while you work on it.
 *
 * State lives in `useEmailTemplateDraft` and both panes read through it, which
 * is what makes selecting a block in the list and selecting it on the canvas the
 * same operation. One `DndContext` spans both so a drag started in either lands
 * in the same order.
 */

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveSampleValues } from "@/lib/comms/sample-values";
import type { EmailBlock, EmailTemplateVariable } from "@/lib/comms/types";
import { BlockContent } from "./canvas/block-content";
import { stripNamespace } from "./canvas/use-block-sortable";
import { CanvasPane, type RenderedPreview } from "./canvas-pane";
import {
  EditorHeader,
  type EmailSettingsDraft,
  type ReadinessCheck,
} from "./editor-header";
import {
  type EmailTemplateDraft,
  undeclaredTokenKeys,
  usedTokenKeys,
  useEmailTemplateDraft,
} from "./hooks/use-email-template-draft";
import { ContentPanel } from "./panels/content-panel";
import { DataPanel } from "./panels/data-panel";
import { SetupPanel } from "./panels/setup-panel";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? "Request failed");
  }
  return body;
};

type LoadedTemplate = EmailTemplateDraft & { id: string };

function toDraft(template: Record<string, unknown>): EmailTemplateDraft {
  return {
    blocks: (template.blocks ?? []) as EmailBlock[],
    description: (template.description as string | null) ?? "",
    name: template.name as string,
    previewText: (template.previewText as string | null) ?? "",
    sampleData: (template.sampleData ?? {}) as Record<string, string>,
    slug: template.slug as string,
    status: template.status as EmailTemplateDraft["status"],
    subject: (template.subject as string) ?? "",
    variables: (template.variables ?? []) as EmailTemplateVariable[],
  };
}

export function TemplateEditor({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR(
    `/api/v1/email-templates/${templateId}`,
    fetcher
  );
  const { data: settingsData, mutate: mutateSettings } = useSWR(
    "/api/v1/email-settings",
    fetcher
  );

  const loadedRaw = data?.data?.template as Record<string, unknown> | undefined;
  const loaded = useMemo<LoadedTemplate | null>(
    () =>
      loadedRaw ? { ...toDraft(loadedRaw), id: loadedRaw.id as string } : null,
    [loadedRaw]
  );

  const save = useCallback(
    async (next: EmailTemplateDraft) => {
      const response = await fetch(`/api/v1/email-templates/${templateId}`, {
        body: JSON.stringify({
          blocks: next.blocks,
          description: next.description || null,
          name: next.name,
          previewText: next.previewText || null,
          sampleData: next.sampleData,
          slug: next.slug,
          status: next.status,
          subject: next.subject,
          variables: next.variables,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error ?? "Failed to save");
      }
    },
    [templateId]
  );

  const editor = useEmailTemplateDraft({ loaded, onSave: save });
  const { draft, saveNow } = editor;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState("content");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    // Distance constraint plus a handle-only activator: dragging must never be
    // confused with selecting text inside a block.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveNow]);

  const settings: EmailSettingsDraft = useMemo(() => {
    const raw = settingsData?.data?.settings as
      | Record<string, string | null>
      | undefined;
    return {
      fromEmail: raw?.fromEmail ?? "",
      fromName: raw?.fromName ?? "",
      replyTo: raw?.replyTo ?? "",
    };
  }, [settingsData]);

  const saveSettings = useCallback(
    async (next: EmailSettingsDraft) => {
      const response = await fetch("/api/v1/email-settings", {
        body: JSON.stringify({
          fromEmail: next.fromEmail || null,
          fromName: next.fromName || null,
          replyTo: next.replyTo || null,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error ?? "Failed to save email settings");
      }
      await mutateSettings();
    },
    [mutateSettings]
  );

  const testSend = useCallback(
    async (to: string) => {
      await saveNow();
      const response = await fetch(
        `/api/v1/email-templates/${templateId}/test-send`,
        {
          body: JSON.stringify({ to }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error ?? "Test send failed");
      }
    },
    [saveNow, templateId]
  );

  const requestTrueRender = useCallback(async (): Promise<RenderedPreview> => {
    if (!draft) {
      throw new Error("Nothing to render");
    }
    const response = await fetch(
      `/api/v1/email-templates/${templateId}/preview`,
      {
        body: JSON.stringify({
          blocks: draft.blocks,
          previewText: draft.previewText || null,
          subject: draft.subject,
          values: draft.sampleData,
          variables: draft.variables,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Preview failed");
    }
    return body.data.rendered as RenderedPreview;
  }, [draft, templateId]);

  const remove = useCallback(async () => {
    const response = await fetch(`/api/v1/email-templates/${templateId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.push("/comms/templates");
    }
  }, [router, templateId]);

  const duplicate = useCallback(async () => {
    if (!draft) {
      return;
    }
    const response = await fetch("/api/v1/email-templates", {
      body: JSON.stringify({
        blocks: draft.blocks,
        description: draft.description || null,
        name: `${draft.name} copy`,
        previewText: draft.previewText || null,
        sampleData: draft.sampleData,
        subject: draft.subject,
        variables: draft.variables,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = await response.json();
    if (response.ok) {
      router.push(`/comms/templates/${body.data.template.id}`);
    }
  }, [draft, router]);

  if (isLoading || !draft) {
    return (
      <div className="flex h-full min-h-0 gap-4 p-4">
        <Skeleton className="h-full w-80 shrink-0" />
        <Skeleton className="h-full flex-1" />
      </div>
    );
  }

  if (error || !loaded) {
    return (
      <p className="p-6 text-destructive text-sm">
        {error instanceof Error ? error.message : "Template not found"}
      </p>
    );
  }

  const undeclared = undeclaredTokenKeys(draft);
  const used = usedTokenKeys(draft);
  const senderConfigured = settings.fromEmail.length > 0;
  const sampleValues = resolveSampleValues(draft.variables, draft.sampleData);

  const checks: ReadinessCheck[] = [
    { label: "Subject line set", ok: draft.subject.trim().length > 0 },
    { label: "Email has at least one block", ok: draft.blocks.length > 0 },
    {
      action: { label: "Fix", onClick: () => setTab("data") },
      label:
        undeclared.length > 0
          ? `${undeclared.length} token${undeclared.length === 1 ? "" : "s"} used but not declared`
          : "All tokens are declared",
      ok: undeclared.length === 0,
    },
    {
      action: {
        label: "Set up",
        onClick: () => router.push("/workspace-settings?section=email"),
      },
      label: senderConfigured
        ? "Sender address configured"
        : "Sender address not configured",
      ok: senderConfigured,
    },
  ];

  const draggingBlock =
    draft.blocks.find((block) => block.id === draggingId) ?? null;

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragCancel={() => setDraggingId(null)}
      onDragEnd={({ active, over }) => {
        setDraggingId(null);
        if (!over || active.id === over.id) {
          return;
        }
        const from = draft.blocks.findIndex(
          (block) => block.id === stripNamespace(String(active.id))
        );
        const to = draft.blocks.findIndex(
          (block) => block.id === stripNamespace(String(over.id))
        );
        if (from >= 0 && to >= 0) {
          editor.moveBlock(from, to);
        }
      }}
      onDragStart={({ active }) =>
        setDraggingId(stripNamespace(String(active.id)))
      }
      sensors={sensors}
    >
      <div className="flex h-full min-h-0 flex-col">
        <EditorHeader
          checks={checks}
          name={draft.name}
          onDelete={() => setConfirmDelete(true)}
          onDuplicate={() => void duplicate()}
          onNameChange={(name) => editor.patch({ name })}
          onSaveSettings={saveSettings}
          onStatusChange={(status) => editor.patch({ status })}
          onTestSend={testSend}
          saveError={editor.saveError}
          saveState={editor.saveState}
          senderConfigured={senderConfigured}
          settings={settings}
          status={draft.status}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Tabs
            className="flex w-[22rem] min-w-0 shrink-0 flex-col border-border border-r"
            onValueChange={setTab}
            value={tab}
          >
            <TabsList className="mx-3 mt-3 shrink-0 justify-start">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="data">
                Data
                {undeclared.length > 0 ? (
                  <span className="ml-1.5 flex size-4 items-center justify-center rounded-full bg-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300">
                    {undeclared.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="setup">Setup</TabsTrigger>
            </TabsList>

            {/* keepMounted so a tab switch never discards in-progress edits. */}
            <TabsContent
              className="mt-0 flex min-h-0 flex-1 flex-col"
              keepMounted
              value="content"
            >
              <ContentPanel
                blocks={draft.blocks}
                onChangeBlock={editor.changeBlock}
                onCreateVariable={editor.declareVariable}
                onDeleteBlock={editor.deleteBlock}
                onInsertBlock={editor.insertBlock}
                onSelectBlock={editor.setSelectedBlockId}
                selectedBlockId={editor.selectedBlockId}
                variables={draft.variables}
              />
            </TabsContent>

            <TabsContent
              className="mt-0 flex min-h-0 flex-1 flex-col"
              keepMounted
              value="data"
            >
              <DataPanel
                onChangeSampleData={(sampleData) =>
                  editor.patch({ sampleData })
                }
                onRemoveVariable={editor.removeVariable}
                onUpsertVariable={editor.upsertVariable}
                sampleData={draft.sampleData}
                undeclaredKeys={undeclared}
                usedKeys={used}
                variables={draft.variables}
              />
            </TabsContent>

            <TabsContent
              className="mt-0 flex min-h-0 flex-1 flex-col"
              keepMounted
              value="setup"
            >
              <SetupPanel
                canActivate={checks.every((check) => check.ok)}
                description={draft.description}
                name={draft.name}
                onChange={editor.patch}
                onCreateVariable={editor.declareVariable}
                onDelete={() => setConfirmDelete(true)}
                previewText={draft.previewText}
                slug={draft.slug}
                status={draft.status}
                variables={draft.variables}
              />
            </TabsContent>
          </Tabs>

          <CanvasPane
            blocks={draft.blocks}
            onChangeBlock={editor.changeBlock}
            onChangeSubject={(subject) => editor.patch({ subject })}
            onCreateVariable={editor.declareVariable}
            onDeleteBlock={editor.deleteBlock}
            onDuplicateBlock={editor.duplicate}
            onInsertBlock={editor.insertBlock}
            onMoveBlock={editor.moveBlock}
            onSelectBlock={editor.setSelectedBlockId}
            requestTrueRender={requestTrueRender}
            sampleValues={sampleValues}
            selectedBlockId={editor.selectedBlockId}
            subject={draft.subject}
            variables={draft.variables}
          />
        </div>
      </div>

      {/* Read-only overlay: dnd-kit transforming a subtree that contains a
          focused contenteditable produces caret artifacts in every browser. */}
      <DragOverlay dropAnimation={null}>
        {draggingBlock ? (
          <div className="rounded-md bg-white px-4 py-1 shadow-lg">
            <BlockContent
              block={draggingBlock}
              mode="static"
              values={sampleValues}
            />
          </div>
        ) : null}
      </DragOverlay>

      <AlertDialog onOpenChange={setConfirmDelete} open={confirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{draft.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Workflows that send this template will fail after it is deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              Delete template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
