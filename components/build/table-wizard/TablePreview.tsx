"use client";

import { Database, Link2, Shield, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WizardState } from "@/lib/build/table-wizard/types";

interface TablePreviewProps {
  state: WizardState;
}

export function TablePreview({ state }: TablePreviewProps) {
  const {
    currentStep,
    tableType,
    name,
    description,
    fields,
    relationships,
    policyGroup,
  } = state;

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-2xl">
          <Database className="h-6 w-6" />
          {name || "New Table"}
        </h2>
        {!!description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>

      {/* Table Type Preview */}
      {currentStep >= 1 && tableType && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-sm">Table Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">
              {tableType === "new" && "New Object"}
              {tableType === "view" && "View/Version"}
              {tableType === "import" && "Import from Schema"}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Schema Preview */}
      {currentStep >= 3 && fields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-sm">
              <Table2 className="h-4 w-4" />
              Schema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  className="flex items-center justify-between rounded-md border border-border bg-background p-2"
                  key={index}
                >
                  <div className="flex-1">
                    <div className="font-medium font-mono text-sm">
                      {field.field_name}
                    </div>
                    {!!field.display_name && (
                      <div className="text-muted-foreground text-xs">
                        {field.display_name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs" variant="outline">
                      {field.data_type || "text"}
                    </Badge>
                    {!!field.is_required && (
                      <Badge className="text-xs" variant="secondary">
                        Required
                      </Badge>
                    )}
                    {!!field.is_unique && (
                      <Badge className="text-xs" variant="secondary">
                        Unique
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationships Preview */}
      {currentStep >= 4 && relationships.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-sm">
              <Link2 className="h-4 w-4" />
              Relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relationships.map((rel, index) => (
                <div
                  className="rounded-md border border-border bg-background p-2"
                  key={index}
                >
                  <div className="font-medium text-sm">
                    {rel.foreign_key_column} → {rel.referenced_table}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {rel.relationship_type || "one-to-many"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies Preview */}
      {currentStep >= 5 && policyGroup && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-sm">
              <Shield className="h-4 w-4" />
              Access Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{policyGroup}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Placeholder for early steps */}
      {currentStep < 3 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                Configure your table to see a live preview here
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
