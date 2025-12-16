"use client";

import { useState } from "react";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RolesOverview } from "./roles-overview";
import { PermissionsMatrix } from "./permissions-matrix";
import { GapDetectionPanel } from "./gap-detection-panel";
import { ExportMigrationDialog } from "./export-migration-dialog";
import { Download, LayoutGrid, ShieldAlert, TableProperties, Undo } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function RolesPermissionsView() {
  const [pendingChanges, setPendingChanges] = useState<
    Array<{ role_id: string; permission: string; action: "add" | "remove" }>
  >([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch Roles & Permissions
  const { data: rolesData, error: rolesError, isLoading: rolesLoading } = useSWR(
    "/api/dev/roles",
    fetcher
  );

  // Fetch Gap Analysis
  const { data: gapsData, isLoading: gapsLoading } = useSWR(
    "/api/dev/roles/gaps",
    fetcher
  );

  if (rolesError) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive">
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
      return [...prev, { role_id: roleId, permission, action }];
    });
  };

  const handleReset = () => {
    setPendingChanges([]);
    toast.info("Changes cleared");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="overview">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="permissions">
                <TableProperties className="h-4 w-4 mr-2" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="gaps">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Gap Detection
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {pendingChanges.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <Undo className="h-4 w-4 mr-2" />
                  Reset ({pendingChanges.length})
                </Button>
              )}
              <Button 
                variant={pendingChanges.length > 0 ? "primary" : "outline"}
                size="sm"
                onClick={() => setIsExportOpen(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Migration
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <RolesOverview 
              roles={rolesData?.roles} 
              permissions={rolesData?.permissions} 
              isLoading={rolesLoading} 
            />
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardContent className="p-0">
                <PermissionsMatrix
                  roles={rolesData?.roles || []}
                  permissions={rolesData?.permissions || []}
                  onChange={handlePermissionChange}
                  pendingChanges={pendingChanges}
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
        isOpen={isExportOpen}
        onOpenChange={setIsExportOpen}
        changes={pendingChanges}
      />
    </div>
  );
}
