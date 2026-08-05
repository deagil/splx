"use client";

import { Globe, Lock, Shield, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_POLICY_GROUPS } from "@/lib/build/table-wizard/policy-groups";
import type { WizardStepProps } from "@/lib/build/table-wizard/types";

const policyGroupIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  private_full: Lock,
  public_readonly: Globe,
  role_based_full: Shield,
  workspace_member_full: Users,
  workspace_member_readonly: Users,
};

export function Step5Policies({ state, updateState }: WizardStepProps) {
  const policyGroups = DEFAULT_POLICY_GROUPS;

  const handlePolicyGroupSelect = (groupId: string) => {
    updateState({ policyGroup: groupId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-2xl">Access Policies</h2>
        <p className="text-muted-foreground">
          Configure Row Level Security (RLS) policies to control who can access
          and modify records in this table.
        </p>
      </div>

      <div className="space-y-3">
        {policyGroups.map((group) => {
          const Icon = policyGroupIcons[group.id] || Shield;
          const isSelected = state.policyGroup === group.id;

          return (
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                isSelected ? "border-2 border-primary" : ""
              }`}
              key={group.id}
              onClick={() => handlePolicyGroupSelect(group.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 font-semibold">{group.name}</h3>
                    {!!group.description && (
                      <p className="mb-2 text-muted-foreground text-sm">
                        {group.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {group.policies.map((policy) => (
                        <span
                          className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs"
                          key={policy.id}
                        >
                          {policy.policy_type}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!state.policyGroup && (
        <div className="rounded-md border border-border/60 border-dashed p-4 text-center text-muted-foreground text-sm">
          Select a policy group above, or leave unselected to configure later
        </div>
      )}
    </div>
  );
}
