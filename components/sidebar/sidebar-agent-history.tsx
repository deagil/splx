"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { queryKeys } from "@/components/agent/lib/query-keys";
import { MoreHorizontalIcon, TrashIcon } from "@/components/shared/icons";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AgentThreadSummary } from "@/lib/types/agent-thread";
import { generateUUID } from "@/lib/utils";

interface GroupedThreads {
  lastMonth: AgentThreadSummary[];
  lastWeek: AgentThreadSummary[];
  older: AgentThreadSummary[];
  today: AgentThreadSummary[];
  yesterday: AgentThreadSummary[];
}

interface ThreadsResponse {
  data: { threads: AgentThreadSummary[] };
}

async function fetchAgentThreads(): Promise<AgentThreadSummary[]> {
  const response = await fetch("/api/v1/agent-threads", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to load threads (${response.status})`);
  }
  const body = (await response.json()) as ThreadsResponse;
  return body.data.threads;
}

function groupThreadsByDate(threads: AgentThreadSummary[]): GroupedThreads {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return threads.reduce(
    (groups, thread) => {
      const threadDate = new Date(thread.updatedAt || thread.createdAt);

      if (isToday(threadDate)) {
        groups.today.push(thread);
      } else if (isYesterday(threadDate)) {
        groups.yesterday.push(thread);
      } else if (threadDate > oneWeekAgo) {
        groups.lastWeek.push(thread);
      } else if (threadDate > oneMonthAgo) {
        groups.lastMonth.push(thread);
      } else {
        groups.older.push(thread);
      }

      return groups;
    },
    {
      lastMonth: [],
      lastWeek: [],
      older: [],
      today: [],
      yesterday: [],
    } as GroupedThreads
  );
}

function ThreadItem({
  thread,
  isActive,
  onDelete,
  onSelect,
}: {
  thread: AgentThreadSummary;
  isActive: boolean;
  onDelete: (threadId: string) => void;
  onSelect: (threadId: string) => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect(thread.id);
  }, [onSelect, thread.id]);

  const handleDelete = useCallback(() => {
    onDelete(thread.id);
  }, [onDelete, thread.id]);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={handleSelect}
        type="button"
      >
        <span className="truncate">{thread.title?.trim() || "New chat"}</span>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="mr-0.5 data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive"
            onClick={handleDelete}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function ThreadGroup({
  label,
  threads,
  activeId,
  onDelete,
  onSelect,
}: {
  label: string;
  threads: AgentThreadSummary[];
  activeId: string | null;
  onDelete: (threadId: string) => void;
  onSelect: (threadId: string) => void;
}) {
  if (threads.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
        {label}
      </div>
      {threads.map((thread) => (
        <ThreadItem
          isActive={thread.id === activeId}
          key={thread.id}
          onDelete={onDelete}
          onSelect={onSelect}
          thread={thread}
        />
      ))}
    </div>
  );
}

/**
 * Chat history for the Eve runtime — lists `agent_threads` instead of legacy
 * `chats`. Selection writes `?chatId=` so `ChatSidebar` remounts the Eve mount
 * with `key={threadId}`.
 */
export function SidebarAgentHistory() {
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const activeId = searchParams.get("chatId");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const threadsQuery = useQuery({
    queryFn: fetchAgentThreads,
    queryKey: queryKeys.threads,
  });

  const selectThread = useCallback(
    (threadId: string) => {
      setOpenMobile(false);
      const params = new URLSearchParams(searchParams.toString());
      params.set("chatId", threadId);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, setOpenMobile]
  );

  const requestDelete = useCallback((threadId: string) => {
    setDeleteId(threadId);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteId) {
      return;
    }
    const threadId = deleteId;

    const deletePromise = fetch(`/api/v1/agent-threads/${threadId}`, {
      method: "DELETE",
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to delete (${response.status})`);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads });
      queryClient.removeQueries({ queryKey: queryKeys.thread(threadId) });
    });

    toast.promise(deletePromise, {
      error: "Failed to delete chat",
      loading: "Deleting chat...",
      success: "Chat deleted",
    });

    setShowDeleteDialog(false);
    setDeleteId(null);

    if (threadId === activeId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("chatId", generateUUID());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [activeId, deleteId, queryClient, router, searchParams]);

  if (threadsQuery.isPending) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((width) => (
              <div
                className="flex h-8 items-center gap-2 rounded-md px-2"
                key={width}
              >
                <div
                  className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-sidebar-accent-foreground/10"
                  style={
                    {
                      "--skeleton-width": `${width}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (threadsQuery.isError) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-sm text-zinc-500">
            Could not load chat history.
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const threads = threadsQuery.data ?? [];
  if (threads.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-sm text-zinc-500">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const grouped = groupThreadsByDate(threads);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <div className="flex flex-col gap-6">
              <ThreadGroup
                activeId={activeId}
                label="Today"
                onDelete={requestDelete}
                onSelect={selectThread}
                threads={grouped.today}
              />
              <ThreadGroup
                activeId={activeId}
                label="Yesterday"
                onDelete={requestDelete}
                onSelect={selectThread}
                threads={grouped.yesterday}
              />
              <ThreadGroup
                activeId={activeId}
                label="Last 7 days"
                onDelete={requestDelete}
                onSelect={selectThread}
                threads={grouped.lastWeek}
              />
              <ThreadGroup
                activeId={activeId}
                label="Last 30 days"
                onDelete={requestDelete}
                onSelect={selectThread}
                threads={grouped.lastMonth}
              />
              <ThreadGroup
                activeId={activeId}
                label="Older"
                onDelete={requestDelete}
                onSelect={selectThread}
                threads={grouped.older}
              />
            </div>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
