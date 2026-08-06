import { CheckIcon, CircleIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TodoItemData = {
  content: string;
  status: TodoStatus;
  priority?: string;
};

function isTodoStatus(value: unknown): value is TodoStatus {
  return (
    value === "pending" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "cancelled"
  );
}

/**
 * Parse a todos payload. Returns `null` when the value is not a todos shape;
 * returns `[]` for a valid empty list (e.g. `{ todos: [], counts: {...} }`).
 */
function parseTodoList(value: unknown): TodoItemData[] | null {
  if (value === undefined || value === null) {
    return null;
  }

  let data: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      data = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as { todos?: unknown };
  const todos = Array.isArray(data)
    ? data
    : Array.isArray(record.todos)
      ? record.todos
      : null;

  // Object with a `todos` key (even empty) or a bare array is a todos payload
  if (todos === null) {
    if (!Array.isArray(data) && "todos" in record) {
      return [];
    }
    return null;
  }

  const items: TodoItemData[] = [];
  for (const entry of todos) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const item = entry as Record<string, unknown>;
    const content =
      typeof item.content === "string"
        ? item.content
        : typeof item.title === "string"
          ? item.title
          : null;
    if (!content || !isTodoStatus(item.status)) {
      continue;
    }
    items.push({
      content,
      priority: typeof item.priority === "string" ? item.priority : undefined,
      status: item.status,
    });
  }

  return items;
}

/**
 * Prefer output todos (final state), fall back to input.
 * Empty arrays are valid (cleared list); `null` means not a todos payload.
 */
export function resolveTodos(
  inputs?: Record<string, unknown>,
  output?: string
): TodoItemData[] | null {
  const fromOutput = parseTodoList(output);
  if (fromOutput !== null) {
    return fromOutput;
  }
  return parseTodoList(inputs);
}

function StatusIcon({ status }: { status: TodoStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckIcon className="size-2.5" strokeWidth={3} />
        </span>
      );
    case "in_progress":
      return (
        <span className="flex size-4 shrink-0 items-center justify-center text-amber-600 dark:text-amber-400">
          <LoaderCircleIcon className="size-3.5 animate-spin" />
        </span>
      );
    case "cancelled":
      return (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <XIcon className="size-2.5" strokeWidth={3} />
        </span>
      );
    case "pending":
      return (
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
          <CircleIcon className="size-3.5" />
        </span>
      );
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function TodosChecklist({ todos }: { todos: TodoItemData[] }) {
  if (todos.length === 0) {
    return <p className="py-0.5 text-muted-foreground text-xs">Nothin to do</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5 py-0.5">
      {todos.map((todo, index) => {
        const done = todo.status === "completed" || todo.status === "cancelled";
        return (
          <li
            className="flex items-start gap-2 text-xs"
            key={`${todo.content}-${index}`}
          >
            <StatusIcon status={todo.status} />
            <span
              className={cn(
                "text-foreground/80 leading-4",
                done && "text-muted-foreground line-through",
                todo.status === "cancelled" && "opacity-60"
              )}
            >
              {todo.content}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
