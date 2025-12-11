"use client";

import useSWR from "swr";
import Link from "next/link";
import { BarChart3, LineChart, PieChart, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ReportRecord = {
  id: string;
  title: string;
  description: string | null;
  chart_type: string | null;
  updated_at: string;
};

const fetcher = async (url: string): Promise<ReportRecord[]> => {
  const response = await fetch(url, { credentials: "same-origin" });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to load reports" }));
    throw new Error(errorData.error || "Failed to load reports");
  }

  const payload = await response.json();
  if (Array.isArray(payload.reports)) {
    return payload.reports as ReportRecord[];
  }
  if (Array.isArray(payload)) {
    return payload as ReportRecord[];
  }
  return [];
};

const chartIcon = (type?: string | null) => {
  if (!type) return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
  const normalized = type.toLowerCase();
  if (normalized.includes("line")) return <LineChart className="h-4 w-4 text-muted-foreground" />;
  if (normalized.includes("pie")) return <PieChart className="h-4 w-4 text-muted-foreground" />;
  return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
};

export function ReportsListView() {
  const { data, error, isLoading, mutate } = useSWR<ReportRecord[]>("/api/reports", fetcher);

  const handleRefresh = async () => {
    await mutate();
  };

  if (error) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-destructive">
        <p className="font-semibold">Failed to load reports</p>
        <p className="mt-1 text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border">
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-background p-12 text-center">
        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="mb-2 font-semibold text-foreground">No reports yet</p>
        <p className="mb-4 text-muted-foreground">Create your first report with the builder.</p>
        <Button variant="primary" size="sm" asChild>
          <Link href="/data/reports/builder">
            <Plus className="mr-2 h-4 w-4" />
            Create Report
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {data.length} {data.length === 1 ? "report" : "reports"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/data/reports/builder">
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.map((report) => (
          <Card key={report.id} className="border">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/data/reports/${report.id}`} className="font-semibold hover:underline">
                    {report.title}
                  </Link>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{report.id}</p>
                </div>
                {chartIcon(report.chart_type)}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {report.description ?? "No description provided."}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">
                  {report.chart_type ? `Chart: ${report.chart_type}` : "Chart: auto"}
                </span>
                <Link href={`/data/reports/${report.id}`} className="text-primary hover:underline">
                  View
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}




