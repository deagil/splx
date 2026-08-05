"use client";

import { BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AIWizardLayout,
  useAIWizardStream,
  WizardConversationPanel,
  WizardInput,
  WizardLoading,
  WizardPreviewPanel,
  WizardStepRenderer,
} from "@/components/ai-wizard";
import { toast } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import type { ReportData, ReportUI } from "@/lib/ai/reports-ui-schema";
import { ReportPreview } from "./report-preview";

export function ReportBuilder() {
  const router = useRouter();
  const [isStarted, setIsStarted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [queryResult, setQueryResult] = useState<Record<string, unknown>[]>();
  const [_isExecutingQuery, setIsExecutingQuery] = useState(false);

  const { start, respond, reset, isStreaming, currentUI, previewData, error } =
    useAIWizardStream<ReportUI, ReportData>({
      endpoint: "/api/reports/generate",
      eventType: "report-ui",
      getPreviewFromUI: (ui) => ui.report,
    });

  // Execute query when previewData changes
  useEffect(() => {
    if (previewData?.sql && !isStreaming) {
      setIsExecutingQuery(true);
      fetch("/api/reports/execute", {
        body: JSON.stringify({ sql: previewData.sql }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
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
          description: error || "Failed to start report generation",
          type: "error",
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
          description: error || "Failed to process response",
          type: "error",
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
    if (!previewData) {
      return;
    }

    // Generate a unique ID from the title
    const baseId = previewData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    const reportId = `${baseId}-${uniqueSuffix}`;

    setIsSaving(true);
    try {
      const response = await fetch("/api/reports", {
        body: JSON.stringify({
          chart_config: previewData.chart_config,
          chart_type: previewData.chart_type,
          description: previewData.description,
          id: reportId,
          sql: previewData.sql,
          title: previewData.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save report");
      }

      const data = await response.json();
      toast({
        description: "Report saved successfully",
        type: "success",
      });

      router.push(`/data/reports/${data.report?.id || data.id}`);
    } catch (e) {
      toast({
        description: e instanceof Error ? e.message : "Failed to save report",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [previewData, router]);

  const handleImprove = useCallback(async () => {
    if (!previewData) {
      return;
    }
    try {
      await start("Please improve this report further", "refine", previewData);
    } catch {
      toast({
        description: "Failed to request improvement",
        type: "error",
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
            <h3 className="font-semibold text-lg">Create a New Report</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Describe the insight you want to visualize and AI will generate
              the SQL and chart configuration.
            </p>
          </div>
          <WizardInput
            onSubmit={handleStart}
            placeholder="e.g., Show total order value by status for the last 6 months..."
            submitLabel="Generate Report"
          />
        </div>
      );
    }

    // Loading state
    if (isStreaming) {
      return (
        <WizardLoading
          description="AI is analyzing your request and creating the report"
          title="Generating report..."
        />
      );
    }

    // Error state
    if (error) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="font-medium text-destructive text-sm">{error}</p>
          </div>
          <Button className="w-full" onClick={handleCancel} variant="outline">
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
            data={previewData}
            improveLabel="Improve Further"
            isSaving={isSaving}
            message={message}
            onImprove={handleImprove}
            onSave={handleSave}
            renderPreview={(data) => (
              <div className="space-y-2">
                <p className="font-medium">{data.title}</p>
                {!!data.description && (
                  <p className="text-muted-foreground text-xs">
                    {data.description}
                  </p>
                )}
              </div>
            )}
            saveLabel="Save & View Report"
            type="final"
          />
        );
      }

      if (type === "clarification") {
        return (
          <WizardStepRenderer
            message={message}
            onSubmit={handleRespond}
            type="clarification"
          />
        );
      }

      if (type === "variants") {
        return (
          <WizardStepRenderer
            message={message}
            onSelect={handleRespond}
            options={
              options?.map((o) => ({ label: o.label, value: o.value })) ?? []
            }
            type="variants"
          />
        );
      }

      // Default to question type
      return (
        <WizardStepRenderer
          message={message}
          onSelect={handleRespond}
          options={
            options?.map((o) => ({ label: o.label, value: o.value })) ?? []
          }
          type="question"
        />
      );
    }

    return null;
  };

  return (
    <AIWizardLayout
      conversationPanel={
        <WizardConversationPanel
          description="Describe the insight you need and AI will create the report for you."
          onCancel={isStarted ? handleCancel : undefined}
          title="Report Builder"
        >
          {renderConversationContent()}
        </WizardConversationPanel>
      }
      previewPanel={
        <WizardPreviewPanel
          emptyDescription="Describe what you want to analyze and the report will appear here as it's being generated."
          emptyIcon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
          emptyMessage="Report preview"
          isEmpty={!previewData && !isStreaming}
        >
          <ReportPreview
            isLoading={isStreaming}
            queryResult={queryResult}
            report={previewData}
          />
        </WizardPreviewPanel>
      }
    />
  );
}
