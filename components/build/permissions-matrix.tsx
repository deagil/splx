"use client";

import React, { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type PermissionRow = {
  resource: string;
  action: string;
  key: string;
};

interface PermissionsMatrixProps {
  roles: string[];
  permissions: Array<{ role_id: string; permission: string; description?: string | null }>;
  onChange: (roleId: string, permission: string, checked: boolean) => void;
  pendingChanges: Array<{ role_id: string; permission: string; action: "add" | "remove" }>;
}

export function PermissionsMatrix({
  roles,
  permissions,
  onChange,
  pendingChanges,
}: PermissionsMatrixProps) {
  // 1. Extract all unique permissions from the DB
  // 2. Group them by resource (e.g., 'pages', 'tables', 'data')
  // 3. Render the grid

  const permissionRows = useMemo(() => {
    const uniquePermissions = Array.from(
      new Set(permissions.map((p) => p.permission))
    ).sort();

    // Ensure we have some default rows if the DB is empty or lacks specific permissions
    // This makes the matrix useful even when starting fresh
    const defaults = [
        "pages.view", "pages.edit", "pages.create", "pages.delete",
        "tables.view", "tables.edit", 
        "data.view", "data.create", "data.edit", "data.delete"
    ];
    
    defaults.forEach(p => {
        if (!uniquePermissions.includes(p)) uniquePermissions.push(p);
    });
    uniquePermissions.sort();

    return uniquePermissions
      .filter((p) => p !== "*") // Admin wildcard handled separately
      .map((p) => {
        const [resource, ...actionParts] = p.split(".");
        // Handle cases like "data.view" vs just "view"
        const action = actionParts.length > 0 ? actionParts.join(".") : resource;
        
        return {
          key: p,
          resource: actionParts.length > 0 ? resource : "system",
          action,
        };
      });
  }, [permissions]);

  // Group rows by resource
  const groupedRows: Record<string, PermissionRow[]> = {};
  permissionRows.forEach((row) => {
    if (!groupedRows[row.resource]) {
      groupedRows[row.resource] = [];
    }
    groupedRows[row.resource].push(row);
  });

  const getPermissionState = (roleId: string, permissionKey: string) => {
    // Check pending changes first
    const pending = pendingChanges.find(
      (c) => c.role_id === roleId && c.permission === permissionKey
    );

    if (pending) {
      return pending.action === "add";
    }

    // Fallback to initial state
    return permissions.some(
      (p) => p.role_id === roleId && p.permission === permissionKey
    );
  };

  const isPending = (roleId: string, permissionKey: string) => {
     return pendingChanges.some(
      (c) => c.role_id === roleId && c.permission === permissionKey
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Permission</TableHead>
            {roles.map((role) => (
              <TableHead key={role} className="text-center">
                <div className="flex items-center justify-center gap-2">
                    {role} 
                    {role === 'admin' && <Lock className="h-3 w-3 text-muted-foreground" />}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedRows).map(([resource, rows]) => (
            <React.Fragment key={resource}>
              <TableRow key={`header-${resource}`} className="bg-muted/50">
                <TableCell colSpan={roles.length + 1} className="font-semibold py-2">
                  {resource.toUpperCase()}
                </TableCell>
              </TableRow>
              {rows.map((row) => (
                <TableRow key={row.key} className="hover:bg-transparent">
                  <TableCell className="font-medium text-xs text-muted-foreground pl-6">
                    {row.action}
                  </TableCell>
                  {roles.map((role) => {
                    const isAdmin = role === "admin";
                    const isChecked = isAdmin || getPermissionState(role, row.key);
                    const pending = isPending(role, row.key);

                    return (
                      <TableCell key={`${role}-${row.key}`} className="text-center p-2">
                        <div className="flex justify-center h-full items-center">
                            <Checkbox
                            checked={isChecked}
                            disabled={isAdmin}
                            className={cn(
                                pending && "border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            )}
                            onCheckedChange={(checked) => {
                                if (!isAdmin) {
                                onChange(role, row.key, checked === true);
                                }
                            }}
                            />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
