"use client";

import { BarChart3, LineChart, PieChart, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportRecord {
  chart_type: string | null;
  description: string | null;
  id: string;
  title: string;
  updated_at: string;
}

const fetcher = async (url: string): Promise<ReportRecord[]> => {
  const response = await fetch(url, { credentials: "same-origin" });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Failed to load reports" }));
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
  if (!type) {
    return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
  }
  const normalized = type.toLowerCase();
  if (normalized.includes("line")) {
    return <LineChart className="h-4 w-4 text-muted-foreground" />;
  }
  if (normalized.includes("pie")) {
    return <PieChart className="h-4 w-4 text-muted-foreground" />;
  }
  return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
};

export function ReportsListView() {
  const { data, error, isLoading, mutate } = useSWR<ReportRecord[]>(
    "/api/reports",
    fetcher
  );

  const handleRefresh = async () => {
    await mutate();
  };

  if (error) {
    return (
      <div className="rounded-md border border-border/60 border-dashed p-8 text-center text-destructive text-sm">
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
            <Card className="border" key={index}>
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
      <div className="rounded-md border border-border/60 border-dashed bg-background p-12 text-center">
        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="mb-2 font-semibold text-foreground">No reports yet</p>
        <p className="mb-4 text-muted-foreground">
          Create your first report with the builder.
        </p>
        <Button asChild size="sm" variant="primary">
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
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="font-medium text-foreground">
            {data.length} {data.length === 1 ? "report" : "reports"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            onClick={handleRefresh}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button asChild size="sm" variant="primary">
            <Link href="/data/reports/builder">
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.map((report) => (
          <Card className="border" key={report.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    className="font-semibold hover:underline"
                    href={`/data/reports/${report.id}`}
                  >
                    {report.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-muted-foreground text-xs">
                    {report.id}
                  </p>
                </div>
                {chartIcon(report.chart_type)}
              </div>
              <p className="line-clamp-2 text-muted-foreground text-sm">
                {report.description ?? "No description provided."}
              </p>
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span className="font-medium">
                  {report.chart_type
                    ? `Chart: ${report.chart_type}`
                    : "Chart: auto"}
                </span>
                <Link
                  className="text-primary hover:underline"
                  href={`/data/reports/${report.id}`}
                >
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
