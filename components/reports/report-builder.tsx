"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { toast } from "@/components/shared/toast";
import {
  AIWizardLayout,
  WizardConversationPanel,
  WizardPreviewPanel,
  WizardStepRenderer,
  WizardInput,
  WizardLoading,
  useAIWizardStream,
} from "@/components/ai-wizard";
import { ReportPreview } from "./report-preview";
import { Button } from "@/components/ui/button";
import type { ReportUI, ReportData } from "@/lib/ai/reports-ui-schema";

export function ReportBuilder() {
  const router = useRouter();
  const [isStarted, setIsStarted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [queryResult, setQueryResult] = useState<Array<Record<string, unknown>>>();
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);

  const {
    start,
    respond,
    reset,
    isStreaming,
    currentUI,
    previewData,
    error,
  } = useAIWizardStream<ReportUI, ReportData>({
    endpoint: "/api/reports/generate",
    eventType: "report-ui",
    getPreviewFromUI: (ui) => ui.report,
  });

  // Execute query when previewData changes
  useEffect(() => {
    if (previewData?.sql && !isStreaming) {
      setIsExecutingQuery(true);
      fetch("/api/reports/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: previewData.sql }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.data) {
            setQueryResult(result.data);
          }
        })
        .catch((e) => {
          console.error("Failed to execute query:", e);
        })
        .finally(() => {
          setIsExecutingQuery(false);
        });
    }
  }, [previewData?.sql, isStreaming]);

  const handleStart = useCallback(
    async (description: string) => {
      setIsStarted(true);
      try {
        await start(description);
      } catch {
        // Error is already set in the hook
        toast({
          type: "error",
          description: error || "Failed to start report generation",
        });
      }
    },
    [start, error]
  );

  const handleRespond = useCallback(
    async (response: string) => {
      try {
        await respond(response);
      } catch {
        toast({
          type: "error",
          description: error || "Failed to process response",
        });
      }
    },
    [respond, error]
  );

  const handleCancel = useCallback(() => {
    reset();
    setIsStarted(false);
  }, [reset]);

  const handleSave = useCallback(async () => {
    if (!previewData) return;

    // Generate a unique ID from the title
    const baseId = previewData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    const reportId = `${baseId}-${uniqueSuffix}`;

    setIsSaving(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reportId,
          title: previewData.title,
          description: previewData.description,
          sql: previewData.sql,
          chart_type: previewData.chart_type,
          chart_config: previewData.chart_config,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save report");
      }

      const data = await response.json();
      toast({
        type: "success",
        description: "Report saved successfully",
      });

      router.push(`/data/reports/${data.report?.id || data.id}`);
    } catch (e) {
      toast({
        type: "error",
        description: e instanceof Error ? e.message : "Failed to save report",
      });
    } finally {
      setIsSaving(false);
    }
  }, [previewData, router]);

  const handleImprove = useCallback(async () => {
    if (!previewData) return;
    try {
      await start("Please improve this report further", "refine", previewData);
    } catch {
      toast({
        type: "error",
        description: "Failed to request improvement",
      });
    }
  }, [previewData, start]);

  const renderConversationContent = () => {
    // Initial input state
    if (!isStarted) {
      return (
        <div className="flex h-full flex-col justify-center">
          <div className="mb-6 text-center">
            <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Create a New Report</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Describe the insight you want to visualize and AI will generate the SQL and chart configuration.
            </p>
          </div>
          <WizardInput
            placeholder="e.g., Show total order value by status for the last 6 months..."
            submitLabel="Generate Report"
            onSubmit={handleStart}
          />
        </div>
      );
    }

    // Loading state
    if (isStreaming) {
      return (
        <WizardLoading
          title="Generating report..."
          description="AI is analyzing your request and creating the report"
        />
      );
    }

    // Error state
    if (error) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
          <Button variant="outline" onClick={handleCancel} className="w-full">
            Start Over
          </Button>
        </div>
      );
    }

    // Current UI step
    if (currentUI) {
      const { type, message, options } = currentUI;

      if (type === "final-report" && previewData) {
        return (
          <WizardStepRenderer
            type="final"
            message={message}
            data={previewData}
            renderPreview={(data) => (
              <div className="space-y-2">
                <p className="font-medium">{data.title}</p>
                {data.description && (
                  <p className="text-xs text-muted-foreground">{data.description}</p>
                )}
              </div>
            )}
            onSave={handleSave}
            onImprove={handleImprove}
            isSaving={isSaving}
            saveLabel="Save & View Report"
            improveLabel="Improve Further"
          />
        );
      }

      if (type === "clarification") {
        return (
          <WizardStepRenderer
            type="clarification"
            message={message}
            onSubmit={handleRespond}
          />
        );
      }

      if (type === "variants") {
        return (
          <WizardStepRenderer
            type="variants"
            message={message}
            options={options?.map((o) => ({ label: o.label, value: o.value })) ?? []}
            onSelect={handleRespond}
          />
        );
      }

      // Default to question type
      return (
        <WizardStepRenderer
          type="question"
          message={message}
          options={options?.map((o) => ({ label: o.label, value: o.value })) ?? []}
          onSelect={handleRespond}
        />
      );
    }

    return null;
  };

  return (
    <AIWizardLayout
      conversationPanel={
        <WizardConversationPanel
          title="Report Builder"
          description="Describe the insight you need and AI will create the report for you."
          onCancel={isStarted ? handleCancel : undefined}
        >
          {renderConversationContent()}
        </WizardConversationPanel>
      }
      previewPanel={
        <WizardPreviewPanel
          isEmpty={!previewData && !isStreaming}
          emptyIcon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
          emptyMessage="Report preview"
          emptyDescription="Describe what you want to analyze and the report will appear here as it's being generated."
        >
          <ReportPreview report={previewData} isLoading={isStreaming} queryResult={queryResult} />
        </WizardPreviewPanel>
      }
    />
  );
}
