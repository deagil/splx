import { Settings2Icon, Trash2Icon } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ReportChart } from "@/components/reports/report-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useReportBlockData, useReports } from "../hooks";
import type { ReportBlockDraft } from "../types";

export interface ReportBlockViewProps {
  block: ReportBlockDraft;
  editControls?: {
    onOpenSettings: () => void;
    onRemove: () => void;
    onStartDrag: (event: ReactPointerEvent) => void;
  };
}

export function ReportBlockView({ block, editControls }: ReportBlockViewProps) {
  const { data, isLoading, error } = useReportBlockData(block);
  const { reports } = useReports();
  const reportDef = reports.find((r) => r.id === block.reportId);

  const title = block.display.title || reportDef?.title || "Untitled Report";
  const hasError = error;

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex h-full min-h-0 w-full flex-col">
        <Card className="flex h-full min-h-0 flex-col">
          <CardHeader
            className={cn(
              "py-3.5",
              editControls
                ? "cursor-grab select-none active:cursor-grabbing"
                : undefined
            )}
            onPointerDown={editControls?.onStartDrag}
            role={editControls ? "presentation" : undefined}
          >
            <CardHeading className="flex w-full items-center gap-3">
              <div className="min-w-0 flex-1 space-y-1 md:me-6">
                <div className="font-medium text-foreground text-sm">
                  {title}
                </div>
                {block.display.title && reportDef ? (
                  <CardDescription className="text-muted-foreground text-xs">
                    {reportDef.title}
                  </CardDescription>
                ) : null}
              </div>
              {editControls ? (
                <div className="ms-auto flex shrink-0 items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label="Configure block"
                        onClick={editControls.onOpenSettings}
                        onPointerDown={(event) => event.stopPropagation()}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <Settings2Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configure block</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label="Remove block"
                        className="border-destructive/60 text-red-500 hover:border-destructive hover:bg-destructive/5"
                        onClick={editControls.onRemove}
                        onPointerDown={(event) => event.stopPropagation()}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove block</TooltipContent>
                  </Tooltip>
                </div>
              ) : null}
            </CardHeading>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Loading report data…
              </div>
            ) : hasError ? (
              <div className="flex h-full items-center justify-center text-destructive text-sm">
                {hasError}
              </div>
            ) : !data || data.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No data available
              </div>
            ) : (
              <div className="h-full w-full">
                <ReportChart
                  chartConfig={
                    (reportDef?.chart_config as Record<string, unknown>) ?? {}
                  }
                  chartType={block.display.chartType || reportDef?.chart_type}
                  data={data}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
