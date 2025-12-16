"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Shield, Hammer, Eye } from "lucide-react";

type RoleDef = {
  id: string;
  label: string;
  description: string;
  count: number;
  color: "default" | "secondary" | "destructive" | "outline";
  icon: React.ComponentType<{ className?: string }>;
};

const ROLE_META: Record<string, Omit<RoleDef, "id" | "count">> = {
  admin: {
    label: "Admin",
    description: "Full access to all resources and settings.",
    color: "destructive",
    icon: Shield,
  },
  builder: {
    label: "Builder",
    description: "Can manage schema, data, and pages. meaningful access.",
    color: "default",
    icon: Hammer,
  },
  user: {
    label: "User",
    description: "Standard access to view and edit data.",
    color: "secondary",
    icon: User,
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to published resources.",
    color: "outline",
    icon: Eye,
  },
};

interface RolesOverviewProps {
  roles?: string[];
  permissions?: Array<{ role_id: string }>;
  isLoading: boolean;
}

export function RolesOverview({ roles, permissions, isLoading }: RolesOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const roleStats = roles?.map((roleId) => {
    const meta = ROLE_META[roleId] || {
      label: roleId,
      description: "Custom role",
      color: "outline",
      icon: User,
    };
    
    // For admin, we show '*', otherwise count explicit permissions
    // Note: This logic might need refinement if we fetch '*' literally for admin
    const count = roleId === 'admin' 
      ? 'All' 
      : permissions?.filter(p => p.role_id === roleId).length ?? 0;

    return {
      id: roleId,
      count,
      ...meta,
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {roleStats?.map((role) => (
        <Card key={role.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {role.label}
            </CardTitle>
            <role.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{role.count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {role.description}
            </p>
            <div className="mt-3">
              <Badge variant={role.color === 'default' ? 'primary' : role.color}>
                 {role.id}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
