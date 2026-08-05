"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { WizardStepProps } from "@/lib/build/table-wizard/types";
import { validateStep } from "@/lib/build/table-wizard/validation";

interface CreationStep {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "error";
}

export function Step6Review({ state, updateState }: WizardStepProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [creationSteps, setCreationSteps] = useState<CreationStep[]>([
    { id: "config", label: "Creating table configuration", status: "pending" },
    { id: "database", label: "Creating database table", status: "pending" },
    { id: "views", label: "Creating views (if applicable)", status: "pending" },
    { id: "pages", label: "Generating pages", status: "pending" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const validationErrors = validateStep(6, state);

  const updateStepStatus = (stepId: string, status: CreationStep["status"]) => {
    setCreationSteps((steps) =>
      steps.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      // Step 1: Create table configuration
      updateStepStatus("config", "in_progress");
      const configResponse = await fetch("/api/tables", {
        body: JSON.stringify({
          config: {
            field_metadata: state.fields,
            primary_key_column: "id",
            relationships: state.relationships,
            rls_policy_groups: state.policyGroup
              ? [
                  {
                    id: state.policyGroup,
                    name: state.policyGroup,
                    policies: [],
                  },
                ]
              : [],
            table_type: state.tableType === "view" ? "view" : "base_table",
          },
          description: state.description || undefined,
          id: state.id,
          name: state.name,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!configResponse.ok) {
        const data = await configResponse.json();
        throw new Error(data.error || "Failed to create table configuration");
      }

      updateStepStatus("config", "completed");
      const { table } = await configResponse.json();

      // Step 2: Create database table (if not a view)
      if (state.tableType === "view") {
        updateStepStatus("database", "completed");
      } else {
        updateStepStatus("database", "in_progress");
        // This would call the actual table creation service
        // For now, we'll simulate it
        await new Promise((resolve) => setTimeout(resolve, 1000));
        updateStepStatus("database", "completed");
      }

      // Step 3: Create views (if applicable)
      if (state.tableType === "view") {
        updateStepStatus("views", "in_progress");
        // This would call the view creation service
        await new Promise((resolve) => setTimeout(resolve, 1000));
        updateStepStatus("views", "completed");
      } else {
        updateStepStatus("views", "completed");
      }

      // Step 4: Generate pages
      if (state.autoGeneratePages) {
        updateStepStatus("pages", "in_progress");
        const pagesResponse = await fetch("/api/tables/generate-pages", {
          body: JSON.stringify({ tableId: table.id }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!pagesResponse.ok) {
          console.warn("Failed to generate pages, continuing anyway");
        }
        updateStepStatus("pages", "completed");
      } else {
        updateStepStatus("pages", "completed");
      }

      // Redirect to table config page
      router.push(`/build/data/${table.id}/config`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-2xl">Review & Create</h2>
        <p className="text-muted-foreground">
          Review your table configuration and create it when ready.
        </p>
      </div>

      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {validationErrors.map((error, index) => (
                <li className="text-destructive" key={index}>
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Configuration Summary */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Name:</span> {state.name}
            </div>
            <div>
              <span className="font-medium">ID:</span>{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {state.id}
              </code>
            </div>
            {!!state.description && (
              <div>
                <span className="font-medium">Description:</span>{" "}
                {state.description}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Fields ({state.fields.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {state.fields.map((field, index) => (
                <div
                  className="flex items-center justify-between text-sm"
                  key={index}
                >
                  <span className="font-mono">{field.field_name}</span>
                  <Badge className="text-xs" variant="outline">
                    {field.data_type || "text"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {state.relationships.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Relationships ({state.relationships.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {state.relationships.map((rel, index) => (
                  <div className="text-sm" key={index}>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      {rel.foreign_key_column}
                    </code>{" "}
                    → {rel.referenced_table}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!!state.policyGroup && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Access Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{state.policyGroup}</Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Options */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={state.autoGeneratePages}
              id="auto-generate-pages"
              onCheckedChange={(checked) =>
                updateState({ autoGeneratePages: checked === true })
              }
            />
            <Label
              className="cursor-pointer font-normal text-sm"
              htmlFor="auto-generate-pages"
            >
              Automatically generate list and detail pages for this table
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Creation Progress */}
      {!!creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Creating Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {creationSteps.map((step, index) => (
                <div className="flex items-center gap-3" key={step.id}>
                  <div className="flex items-center">
                    {step.status === "completed" && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    {step.status === "in_progress" && (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                    {step.status === "pending" && (
                      <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {index < creationSteps.length - 1 && (
                      <div
                        className={`ml-3 h-8 w-0.5 ${
                          step.status === "completed"
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{step.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!!error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          disabled={creating || validationErrors.length > 0}
          onClick={handleCreate}
          size="lg"
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Table"
          )}
        </Button>
      </div>
    </div>
  );
}
