"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportRecord } from "@/lib/server/reports";
import type { TableRecord } from "@/lib/server/tables";
import { useMentionableData } from "./mention-context";
import type {
  ListBlockDraft,
  RecordBlockDraft,
  ReportBlockDraft,
  TriggerBlockDraft,
} from "./types";

export interface ListBlockData {
  columns: string[];
  pagination: {
    page: number;
    limit: number;
    totalRows: number;
    totalPages: number;
  };
  rows: Record<string, unknown>[];
  tableName: string;
}

export interface RecordBlockData {
  columns: string[];
  record: Record<string, unknown> | null;
  tableName: string;
}

export function useTableMetadata(tableName: string | null) {
  const [table, setTable] = useState<TableRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_requestId, setRequestId] = useState(0);

  const fetchMetadata = useCallback(
    async (signal?: AbortSignal) => {
      if (!tableName) {
        setTable(null);
        setError("Table is not configured");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/tables/metadata?table=${encodeURIComponent(tableName)}`,
          { signal }
        );

        if (!response.ok) {
          const payload = await safeJson(response);
          throw new Error(payload?.error ?? "Failed to load table metadata");
        }

        const payload = (await response.json()) as { table: TableRecord };
        setTable(payload.table);
      } catch (caught) {
        if ((caught as Error)?.name === "AbortError") {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unknown error");
        setTable(null);
      } finally {
        setIsLoading(false);
      }
    },
    [tableName]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchMetadata(controller.signal);
    return () => controller.abort();
  }, [fetchMetadata]);

  const reload = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  return {
    error,
    isLoading,
    reload,
    table,
  };
}

export function useListBlockData(
  block: ListBlockDraft,
  urlParams: Record<string, string>
) {
  const [data, setData] = useState<ListBlockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_requestId, setRequestId] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("table", block.tableName);
    params.set("page", "1");
    params.set("limit", "100");

    for (const filter of block.filters) {
      if (!filter.column) {
        continue;
      }
      if (filter.operator === "is_null" || filter.operator === "is_not_null") {
        params.set(`filter_op[${filter.column}]`, filter.operator);
        continue;
      }

      const resolvedValue = resolveUrlValue(filter.value, urlParams);
      if (
        resolvedValue !== null &&
        resolvedValue !== undefined &&
        resolvedValue !== ""
      ) {
        params.set(`filter_op[${filter.column}]`, filter.operator);
        params.set(`filter[${filter.column}]`, resolvedValue);
      }
    }
    )

    return params.toString();
  }, [block.filters, block.tableName, urlParams]);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!block.tableName) {
        setData(null);
        setError("Table is not configured");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/supabase/table?${queryString}`, {
          signal,
        });

        if (!response.ok) {
          const payload = await safeJson(response);
          throw new Error(payload?.error ?? "Failed to load table data");
        }

        const payload = (await response.json()) as ListBlockData;
        setData(payload);
      } catch (caught) {
        if ((caught as Error)?.name === "AbortError") {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unknown error");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [block.tableName, queryString]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Register block data with mention context
  const { registerBlockData, unregisterBlockData } = useMentionableData();
  useEffect(() => {
    if (data && block.tableName) {
      registerBlockData({
        blockId: block.id,
        blockType: "list",
        data,
        description: `${data.rows.length} rows from ${block.tableName}`,
        label: `List: ${block.tableName}`,
        tableName: block.tableName,
      });
    }
    return () => {
      unregisterBlockData(block.id);
    };
  }, [data, block.id, block.tableName, registerBlockData, unregisterBlockData]);

  const reload = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  return {
    data,
    error,
    isLoading,
    reload,
  };
}

export function useRecordBlockData(
  block: RecordBlockDraft,
  urlParams: Record<string, string>
) {
  const [data, setData] = useState<RecordBlockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_requestId, setRequestId] = useState(0);

  const { queryString, resolvedId } = useMemo(() => {
    const params = new URLSearchParams();
    params.set("table", block.tableName);
    params.set("idColumn", "id");
    const resolvedId = resolveUrlValue(block.recordId, urlParams);
    if (resolvedId) {
      params.set("id", resolvedId);
    }
    return { queryString: params.toString(), resolvedId };
  }, [block.recordId, block.tableName, urlParams]);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!block.tableName) {
        setData(null);
        setError("Table is not configured");
        return;
      }
      if (!block.recordId || !resolvedId) {
        setData(null);
        setError("Record identifier is not available");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/supabase/record?${queryString}`, {
          signal,
        });

        if (!response.ok) {
          const payload = await safeJson(response);
          throw new Error(payload?.error ?? "Failed to load record data");
        }

        const payload = (await response.json()) as RecordBlockData;
        setData(payload);
      } catch (caught) {
        if ((caught as Error)?.name === "AbortError") {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unknown error");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [block.recordId, block.tableName, queryString, resolvedId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Register block data with mention context
  const { registerBlockData, unregisterBlockData } = useMentionableData();
  useEffect(() => {
    if (data && block.tableName && data.record) {
      registerBlockData({
        blockId: block.id,
        blockType: "record",
        data,
        description: `Record from ${block.tableName}`,
        label: `Record: ${block.tableName}`,
        tableName: block.tableName,
      });
    }
    return () => {
      unregisterBlockData(block.id);
    };
  }, [data, block.id, block.tableName, registerBlockData, unregisterBlockData]);

  const reload = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  return {
    data,
    error,
    isLoading,
    reload,
  };
}

export function useReportBlockData(block: ReportBlockDraft) {
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_requestId, setRequestId] = useState(0);

  // We need to fetch the report definition to get the SQL
  const { reports } = useReports();
  const reportDef = useMemo(
    () => reports.find((r) => r.id === block.reportId),
    [reports, block.reportId]
  );

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!block.reportId) {
        setData(null);
        setError("Report is not configured");
        return;
      }

      if (!reportDef) {
        // Wait for report definition to load or it might be missing
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/reports/execute", {
          body: JSON.stringify({
            sql: reportDef.sql,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal,
        });

        if (!response.ok) {
          const payload = await safeJson(response);
          throw new Error(payload?.error ?? "Failed to load report data");
        }

        const payload = (await response.json()) as {
          data: Record<string, unknown>[];
        };
        setData(payload.data);
      } catch (caught) {
        if ((caught as Error)?.name === "AbortError") {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unknown error");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [block.reportId, reportDef]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const reload = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  return {
    data,
    error,
    isLoading,
    reload,
  };
}

export function useReports() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/reports", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Failed to load reports");
        }
        const payload = await response.json();
        setReports(payload.reports ?? []);
      } catch (caught) {
        if ((caught as Error)?.name !== "AbortError") {
          setError("Failed to load reports");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
    return () => controller.abort();
  }, []);

  return { error, isLoading, reports };
}

export function useTriggerBlockAction(block: TriggerBlockDraft) {
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setStatus("pending");
    setError(null);
    try {
      const workflowId = block.display.hookName?.trim();
      if (!workflowId) {
        throw new Error("Trigger block has no workflow id (hookName)");
      }

      const response = await fetch(`/api/v1/workflows/${workflowId}/run`, {
        body: JSON.stringify({
          context: { event: null, source: "trigger_block", steps: [] },
          triggerSource: "trigger_block",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      const body = await safeJson(response);
      if (!response.ok) {
        throw new Error(
          (body as { error?: string } | null)?.error ??
            `Trigger failed (${response.status})`
        );
      }

      setStatus("success");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Trigger failed");
    }
  }, [block.display.hookName]);

  return {
    error,
    execute,
    status,
  };
}

function resolveUrlValue(
  value: string,
  urlParams: Record<string, string>
): string | null {
  if (!value) {
    return value;
  }
  if (!value.startsWith("url.")) {
    return value;
  }
  const key = value.slice(4);
  return urlParams[key] ?? null;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
