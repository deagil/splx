"use client";

import {
  Download,
  LayoutGrid,
  ShieldAlert,
  TableProperties,
  Undo,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportMigrationDialog } from "./export-migration-dialog";
import { GapDetectionPanel } from "./gap-detection-panel";
import { PermissionsMatrix } from "./permissions-matrix";
import { RolesOverview } from "./roles-overview";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function RolesPermissionsView() {
  const [pendingChanges, setPendingChanges] = useState<
    Array<{ role_id: string; permission: string; action: "add" | "remove" }>
  >([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch Roles & Permissions
  const {
    data: rolesData,
    error: rolesError,
    isLoading: rolesLoading,
  } = useSWR("/api/dev/roles", fetcher);

  // Fetch Gap Analysis
  const { data: gapsData, isLoading: gapsLoading } = useSWR(
    "/api/dev/roles/gaps",
    fetcher
  );

  if (rolesError) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        Error loading roles: {rolesError.message}
      </div>
    );
  }

  const handlePermissionChange = (
    roleId: string,
    permission: string,
    checked: boolean
  ) => {
    setPendingChanges((prev) => {
      // Check if we are reverting a pending change
      const existingIndex = prev.findIndex(
        (c) => c.role_id === roleId && c.permission === permission
      );

      if (existingIndex >= 0) {
        // Remove from pending if we are toggling back
        const newChanges = [...prev];
        newChanges.splice(existingIndex, 1);
        return newChanges;
      }

      // Determine action based on initial state
      // Note: We need to know if the permission existed initially to know if "checked=true" means "add"
      // or if "checked=false" means "remove".
      // Simplified: If checked, we want to ADD. If unchecked, we want to REMOVE.
      // But we block duplicates in the DB unique constraint, and DELETE only if exists.

      const action = checked ? "add" : "remove";
      return [...prev, { action, permission, role_id: roleId }];
    });
  };

  const handleReset = () => {
    setPendingChanges([]);
    toast.info("Changes cleared");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs className="w-full" defaultValue="overview">
          <div className="mb-4 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="overview">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="permissions">
                <TableProperties className="mr-2 h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="gaps">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Gap Detection
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {pendingChanges.length > 0 && (
                <Button onClick={handleReset} size="sm" variant="ghost">
                  <Undo className="mr-2 h-4 w-4" />
                  Reset ({pendingChanges.length})
                </Button>
              )}
              <Button
                onClick={() => setIsExportOpen(true)}
                size="sm"
                variant={pendingChanges.length > 0 ? "primary" : "outline"}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Migration
              </Button>
            </div>
          </div>

          <TabsContent className="space-y-4" value="overview">
            <RolesOverview
              isLoading={rolesLoading}
              permissions={rolesData?.permissions}
              roles={rolesData?.roles}
            />
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardContent className="p-0">
                <PermissionsMatrix
                  onChange={handlePermissionChange}
                  pendingChanges={pendingChanges}
                  permissions={rolesData?.permissions || []}
                  roles={rolesData?.roles || []}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps">
            <Card>
              <CardContent className="pt-6">
                <GapDetectionPanel data={gapsData} isLoading={gapsLoading} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ExportMigrationDialog
        changes={pendingChanges}
        isOpen={isExportOpen}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}
