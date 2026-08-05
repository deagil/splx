import { ArrowLeft, BarChart3, Code2, Table2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportChart } from "@/components/reports/report-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReport } from "@/lib/server/reports/repository";
import { runReportQuery } from "@/lib/server/reports/run-query";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";

interface ReportDetailPageProps {
  params: Promise<{ reportId: string }>;
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "tables.view");

  const { reportId } = await params;
  const report = await getReport(tenant, reportId);

  if (!report) {
    notFound();
  }

  let data: Record<string, unknown>[] = [];
  let queryError: string | null = null;

  try {
    data = await runReportQuery(tenant, report.sql);
  } catch (e) {
    queryError = e instanceof Error ? e.message : "Failed to execute query";
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button asChild className="h-8 w-8" size="icon" variant="ghost">
              <Link href="/data/reports">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="font-bold text-2xl">{report.title}</h1>
          </div>
          {!!report.description && (
            <p className="ml-11 text-muted-foreground">{report.description}</p>
          )}
        </div>
        {!!report.chart_type && (
          <Badge className="gap-1.5" variant="secondary">
            <BarChart3 className="h-3 w-3" />
            {report.chart_type}
          </Badge>
        )}
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queryError ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
              <p className="text-destructive text-sm">{queryError}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30">
              <p className="text-muted-foreground text-sm">
                No data returned by query
              </p>
            </div>
          ) : (
            <ReportChart
              chartConfig={report.chart_config}
              chartType={report.chart_type}
              data={data}
            />
          )}
        </CardContent>
      </Card>

      {/* SQL Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            SQL Query
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/50 p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-foreground text-sm">
              {report.sql}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Data Table Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table2 className="h-4 w-4 text-muted-foreground" />
            Data
            {data.length > 0 && (
              <Badge className="ml-2 font-normal text-xs" variant="outline">
                {data.length} {data.length === 1 ? "row" : "rows"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queryError ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
              <p className="text-destructive text-sm">{queryError}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/30">
              <p className="text-muted-foreground text-sm">
                No data returned by query
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    {columns.map((col) => (
                      <th
                        className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground"
                        key={col}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr className="border-b last:border-0" key={rowIndex}>
                      {columns.map((col) => (
                        <td className="whitespace-nowrap px-4 py-3" key={col}>
                          {formatCellValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
