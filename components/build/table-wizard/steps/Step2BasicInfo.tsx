"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WizardStepProps } from "@/lib/build/table-wizard/types";

export function Step2BasicInfo({ state, updateState }: WizardStepProps) {
  const handleNameChange = (value: string) => {
    updateState({ name: value });

    // Auto-generate ID from name if ID is empty
    if (!state.id) {
      const generatedId = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      updateState({ id: generatedId });
    }
  };

  const handleIdChange = (value: string) => {
    // Only allow valid characters
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 64);
    updateState({ id: sanitized });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-2xl">Basic Information</h2>
        <p className="text-muted-foreground">
          Provide the fundamental details for your table. The table ID will be
          used for API routes and internal references.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Display Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            maxLength={120}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Table"
            required
            value={state.name}
          />
          <p className="text-muted-foreground text-xs">
            Human-readable name for the table ({state.name.length}/120)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="id">
            Table ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="id"
            maxLength={64}
            onChange={(e) => handleIdChange(e.target.value)}
            pattern="[a-z0-9_-]+"
            placeholder="my_table"
            required
            value={state.id}
          />
          <p className="text-muted-foreground text-xs">
            Lowercase alphanumerics, hyphens, and underscores only. Used for API
            routes and internal references. ({state.id.length}/64)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            maxLength={512}
            onChange={(e) => updateState({ description: e.target.value })}
            placeholder="A brief description of what this table stores..."
            rows={4}
            value={state.description}
          />
          <p className="text-muted-foreground text-xs">
            Optional description to help understand the table's purpose (
            {state.description.length}/512)
          </p>
        </div>
      </div>
    </div>
  );
}
