"use client";

import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Matches type from API
interface GapAnalysis {
  incompleteCrud: Array<{
    resource: string;
    missingActions: string[];
  }>;
  missingPermissions: Array<{
    permission: string;
    tablename: string;
    policyname: string;
  }>;
  tablesWithoutPolicies: string[];
  tablesWithoutRls: string[];
}

interface GapDetectionPanelProps {
  data?: GapAnalysis;
  isLoading: boolean;
  onApplyFix?: (fixType: string, payload: any) => void;
}

export function GapDetectionPanel({ data, isLoading }: GapDetectionPanelProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Analyzing policies...
      </div>
    );
  }

  if (!data?.missingPermissions) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No gap analysis data available.
      </div>
    );
  }

  const hasIssues =
    data.missingPermissions.length > 0 ||
    data.tablesWithoutPolicies.length > 0 ||
    data.tablesWithoutRls.length > 0 ||
    data.incompleteCrud.length > 0;

  if (!hasIssues) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="font-semibold text-lg">All Systems Nominal</h3>
        <p className="text-muted-foreground">
          No policy or permission gaps detected.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        {/* CRITICAL: Tables without RLS */}
        {data.tablesWithoutRls.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center font-semibold text-destructive text-sm">
              <AlertCircle className="mr-2 h-4 w-4" />
              Security Risk: Tables without RLS
            </h3>
            {data.tablesWithoutRls.map((table) => (
              <Alert key={table} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>RLS Disabled: {table}</AlertTitle>
                <AlertDescription>
                  Table <code>{table}</code> has Row Level Security disabled.
                  This means it can be accessed by any user with a connection to
                  the DB, ignoring policies.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* ERROR: Missing Permissions used in Policies */}
        {data.missingPermissions.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center font-semibold text-red-500 text-sm">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Missing Definitions
            </h3>
            {data.missingPermissions.map((p, i) => (
              <Alert
                className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10"
                key={`${p.permission}-${i}`}
              >
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertTitle>Undefined Permission: {p.permission}</AlertTitle>
                <AlertDescription className="text-red-800 dark:text-red-300">
                  Referenced in policy <code>{p.policyname}</code> on table{" "}
                  <code>{p.tablename}</code> but not present in{" "}
                  <code>role_permissions</code>.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* WARNING: Tables without Policies */}
        {data.tablesWithoutPolicies.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center font-semibold text-amber-500 text-sm">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Orphan Tables
            </h3>
            {data.tablesWithoutPolicies.map((table) => (
              <Alert
                className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/10"
                key={table}
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle>No Policies: {table}</AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  RLS is enabled but no policies exist. No rows will be visible
                  to non-superusers.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* INFO: Incomplete CRUD */}
        {data.incompleteCrud.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center font-semibold text-blue-500 text-sm">
              <Info className="mr-2 h-4 w-4" />
              Incomplete CRUD Coverage
            </h3>
            {data.incompleteCrud.map((item) => (
              <Alert
                className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/10"
                key={item.resource}
              >
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle>Partially Covered: {item.resource}</AlertTitle>
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  Missing actions:{" "}
                  {item.missingActions.map((a) => (
                    <Badge className="mr-1 text-xs" key={a} variant="outline">
                      {a}
                    </Badge>
                  ))}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
