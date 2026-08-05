"use client";

import { Eye, Hammer, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleDef {
  color: "default" | "secondary" | "destructive" | "outline";
  count: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  label: string;
}

const ROLE_META: Record<string, Omit<RoleDef, "id" | "count">> = {
  admin: {
    color: "destructive",
    description: "Full access to all resources and settings.",
    icon: Shield,
    label: "Admin",
  },
  builder: {
    color: "default",
    description: "Can manage schema, data, and pages. meaningful access.",
    icon: Hammer,
    label: "Builder",
  },
  user: {
    color: "secondary",
    description: "Standard access to view and edit data.",
    icon: User,
    label: "User",
  },
  viewer: {
    color: "outline",
    description: "Read-only access to published resources.",
    icon: Eye,
    label: "Viewer",
  },
};

interface RolesOverviewProps {
  isLoading: boolean;
  permissions?: Array<{ role_id: string }>;
  roles?: string[];
}

export function RolesOverview({
  roles,
  permissions,
  isLoading,
}: RolesOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton className="h-32 w-full" key={i} />
        ))}
      </div>
    );
  }

  const roleStats = roles?.map((roleId) => {
    const meta = ROLE_META[roleId] || {
      color: "outline",
      description: "Custom role",
      icon: User,
      label: roleId,
    };

    // For admin, we show '*', otherwise count explicit permissions
    // Note: This logic might need refinement if we fetch '*' literally for admin
    const count =
      roleId === "admin"
        ? "All"
        : (permissions?.filter((p) => p.role_id === roleId).length ?? 0);

    return {
      count,
      id: roleId,
      ...meta,
    };
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {roleStats?.map((role) => (
        <Card key={role.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">{role.label}</CardTitle>
            <role.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{role.count}</div>
            <p className="mt-1 text-muted-foreground text-xs">
              {role.description}
            </p>
            <div className="mt-3">
              <Badge
                variant={role.color === "default" ? "primary" : role.color}
              >
                {role.id}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
