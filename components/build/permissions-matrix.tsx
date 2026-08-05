"use client";

import { Lock } from "lucide-react";
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
import { cn } from "@/lib/utils";

export interface PermissionRow {
  action: string;
  key: string;
  resource: string;
}

interface PermissionsMatrixProps {
  onChange: (roleId: string, permission: string, checked: boolean) => void;
  pendingChanges: Array<{
    role_id: string;
    permission: string;
    action: "add" | "remove";
  }>;
  permissions: Array<{
    role_id: string;
    permission: string;
    description?: string | null;
  }>;
  roles: string[];
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
      "pages.view",
      "pages.edit",
      "pages.create",
      "pages.delete",
      "tables.view",
      "tables.edit",
      "data.view",
      "data.create",
      "data.edit",
      "data.delete",
    ];

    for (const p of defaults) {
      if (!uniquePermissions.includes(p)) {
        uniquePermissions.push(p);
      }
    }
    uniquePermissions.sort();

    return uniquePermissions
      .filter((p) => p !== "*") // Admin wildcard handled separately
      .map((p) => {
        const [resource, ...actionParts] = p.split(".");
        // Handle cases like "data.view" vs just "view"
        const action =
          actionParts.length > 0 ? actionParts.join(".") : resource;

        return {
          action,
          key: p,
          resource: actionParts.length > 0 ? resource : "system",
        };
      });
  }, [permissions]);

  // Group rows by resource
  const groupedRows: Record<string, PermissionRow[]> = {};
  for (const row of permissionRows) {
    if (!groupedRows[row.resource]) {
      groupedRows[row.resource] = [];
    }
    groupedRows[row.resource].push(row);
  }

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

  const isPending = (roleId: string, permissionKey: string) =>
    pendingChanges.some(
      (c) => c.role_id === roleId && c.permission === permissionKey
    );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Permission</TableHead>
            {roles.map((role) => (
              <TableHead className="text-center" key={role}>
                <div className="flex items-center justify-center gap-2">
                  {role}
                  {role === "admin" && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedRows).map(([resource, rows]) => (
            <React.Fragment key={resource}>
              <TableRow className="bg-muted/50" key={`header-${resource}`}>
                <TableCell
                  className="py-2 font-semibold"
                  colSpan={roles.length + 1}
                >
                  {resource.toUpperCase()}
                </TableCell>
              </TableRow>
              {rows.map((row) => (
                <TableRow className="hover:bg-transparent" key={row.key}>
                  <TableCell className="pl-6 font-medium text-muted-foreground text-xs">
                    {row.action}
                  </TableCell>
                  {roles.map((role) => {
                    const isAdmin = role === "admin";
                    const isChecked =
                      isAdmin || getPermissionState(role, row.key);
                    const pending = isPending(role, row.key);

                    return (
                      <TableCell
                        className="p-2 text-center"
                        key={`${role}-${row.key}`}
                      >
                        <div className="flex h-full items-center justify-center">
                          <Checkbox
                            checked={isChecked}
                            className={cn(
                              pending &&
                                "border-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500"
                            )}
                            disabled={isAdmin}
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
