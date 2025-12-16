"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

// Matches type from API
type GapAnalysis = {
  missingPermissions: Array<{
    permission: string;
    tablename: string;
    policyname: string;
  }>;
  tablesWithoutPolicies: string[];
  tablesWithoutRls: string[];
  incompleteCrud: Array<{
    resource: string;
    missingActions: string[];
  }>;
};

interface GapDetectionPanelProps {
  data?: GapAnalysis;
  isLoading: boolean;
  onApplyFix?: (fixType: string, payload: any) => void;
}

export function GapDetectionPanel({ data, isLoading }: GapDetectionPanelProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Analyzing policies...</div>;
  }

  if (!data || !data.missingPermissions) {
    return <div className="p-8 text-center text-muted-foreground">No gap analysis data available.</div>;
  }

  const hasIssues = 
    data.missingPermissions.length > 0 || 
    data.tablesWithoutPolicies.length > 0 || 
    data.tablesWithoutRls.length > 0 ||
    data.incompleteCrud.length > 0;

  if (!hasIssues) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold">All Systems Nominal</h3>
        <p className="text-muted-foreground">No policy or permission gaps detected.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        
        {/* CRITICAL: Tables without RLS */}
        {data.tablesWithoutRls.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center text-destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                Security Risk: Tables without RLS
            </h3>
            {data.tablesWithoutRls.map((table) => (
              <Alert variant="destructive" key={table}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>RLS Disabled: {table}</AlertTitle>
                <AlertDescription>
                  Table <code>{table}</code> has Row Level Security disabled. This means it can be accessed by any user with a connection to the DB, ignoring policies.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* ERROR: Missing Permissions used in Policies */}
        {data.missingPermissions.length > 0 && (
            <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center text-red-500">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Missing Definitions
                </h3>
                {data.missingPermissions.map((p, i) => (
                <Alert key={`${p.permission}-${i}`} className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertTitle>Undefined Permission: {p.permission}</AlertTitle>
                    <AlertDescription className="text-red-800 dark:text-red-300">
                    Referenced in policy <code>{p.policyname}</code> on table <code>{p.tablename}</code> but not present in <code>role_permissions</code>.
                    </AlertDescription>
                </Alert>
                ))}
            </div>
        )}

        {/* WARNING: Tables without Policies */}
        {data.tablesWithoutPolicies.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center text-amber-500">
                 <AlertTriangle className="h-4 w-4 mr-2" />
                 Orphan Tables
            </h3>
            {data.tablesWithoutPolicies.map((table) => (
              <Alert key={table} className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/10">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle>No Policies: {table}</AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  RLS is enabled but no policies exist. No rows will be visible to non-superusers.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* INFO: Incomplete CRUD */}
        {data.incompleteCrud.length > 0 && (
            <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center text-blue-500">
                    <Info className="h-4 w-4 mr-2" />
                    Incomplete CRUD Coverage
                </h3>
                {data.incompleteCrud.map((item) => (
                <Alert key={item.resource} className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle>Partially Covered: {item.resource}</AlertTitle>
                    <AlertDescription className="text-blue-800 dark:text-blue-300">
                    Missing actions: {item.missingActions.map(a => <Badge key={a} variant="outline" className="mr-1 text-xs">{a}</Badge>)}
                    </AlertDescription>
                </Alert>
                ))}
            </div>
        )}
      </div>
    </ScrollArea>
  );
}
