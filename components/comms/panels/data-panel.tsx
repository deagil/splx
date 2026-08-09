"use client";

/**
 * "Data" tab: the variables this template declares, and the sample values used
 * to render both previews.
 *
 * Declaring data is never a prerequisite here — `TokenField`'s "＋ New variable"
 * writes straight into this list — so this panel is a review surface. Its main
 * job is surfacing the two states that break a send: a token used but never
 * declared, and a required variable with no sample value to preview with.
 */

import { AlertTriangleIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { placeholderValues } from "@/lib/comms/sample-values";
import { labelFromTokenKey } from "@/lib/comms/tokens";
import {
  EMAIL_VARIABLE_TYPES,
  type EmailTemplateVariable,
  type EmailVariableType,
} from "@/lib/comms/types";

export interface DataPanelProps {
  onChangeSampleData: (next: Record<string, string>) => void;
  onRemoveVariable: (key: string) => void;
  onUpsertVariable: (variable: EmailTemplateVariable, atIndex?: number) => void;
  sampleData: Record<string, string>;
  undeclaredKeys: string[];
  usedKeys: string[];
  variables: EmailTemplateVariable[];
}

export function DataPanel({
  onChangeSampleData,
  onRemoveVariable,
  onUpsertVariable,
  sampleData,
  undeclaredKeys,
  usedKeys,
  variables,
}: DataPanelProps) {
  const placeholders = placeholderValues(variables);

  const addVariable = () => {
    let index = variables.length + 1;
    let key = `variable${index}`;
    while (variables.some((variable) => variable.key === key)) {
      index += 1;
      key = `variable${index}`;
    }
    onUpsertVariable({
      key,
      label: labelFromTokenKey(key),
      required: true,
      type: "string",
    });
  };

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
      {undeclaredKeys.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="flex items-center gap-2 font-medium text-amber-700 text-sm dark:text-amber-300">
            <AlertTriangleIcon className="size-4 shrink-0" />
            {undeclaredKeys.length} undeclared{" "}
            {undeclaredKeys.length === 1 ? "token" : "tokens"}
          </p>
          <p className="text-muted-foreground text-xs">
            These appear in the email but have no declared variable, so a
            workflow can never supply them and they will send as literal text.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {undeclaredKeys.map((key) => (
              <button
                className="rounded-md border border-amber-500/40 bg-background px-2 py-1 font-mono text-xs transition-colors hover:border-amber-500"
                key={key}
                onClick={() =>
                  onUpsertVariable({
                    key,
                    label: labelFromTokenKey(key),
                    required: true,
                    type: key.toLowerCase().endsWith("url") ? "url" : "string",
                  })
                }
                type="button"
              >
                Declare {key}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-sm">Required data</h2>
            <p className="text-muted-foreground text-xs">
              Shown as a mapping form on the send email workflow step.
            </p>
          </div>
          <Button onClick={addVariable} size="sm" type="button" variant="ghost">
            <PlusIcon className="size-3.5" />
            Add
          </Button>
        </div>

        {variables.length === 0 ? (
          <p className="rounded-lg border border-border border-dashed px-3 py-6 text-center text-muted-foreground text-sm">
            No variables yet. Type <code>{"{{"}</code> anywhere in the email to
            create one.
          </p>
        ) : null}

        <div className="space-y-2">
          {variables.map((variable, index) => {
            const used = usedKeys.includes(variable.key);
            return (
              <div
                className="space-y-2 rounded-lg border border-border p-2.5"
                // The key field is editable, so it is briefly empty or duplicated
                // mid-edit; the index keeps rows stable through that.
                // biome-ignore lint/suspicious/noArrayIndexKey: variable.key is user-editable and not unique while typing
                key={`${variable.key}-${index}`}
              >
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Variable label"
                    className="flex-1"
                    onChange={(event) =>
                      onUpsertVariable(
                        { ...variable, label: event.target.value },
                        index
                      )
                    }
                    placeholder="Label"
                    value={variable.label}
                  />
                  <button
                    aria-label={`Remove ${variable.label}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onRemoveVariable(variable.key)}
                    type="button"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Variable key"
                    className="flex-1 font-mono text-xs"
                    onChange={(event) =>
                      onUpsertVariable(
                        { ...variable, key: event.target.value },
                        index
                      )
                    }
                    placeholder="customer.firstName"
                    value={variable.key}
                  />
                  <Select
                    onValueChange={(next) =>
                      onUpsertVariable(
                        { ...variable, type: next as EmailVariableType },
                        index
                      )
                    }
                    value={variable.type}
                  >
                    <SelectTrigger className="w-28 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_VARIABLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-muted-foreground text-xs">
                    <input
                      checked={variable.required}
                      className="size-3.5 accent-primary"
                      onChange={(event) =>
                        onUpsertVariable(
                          { ...variable, required: event.target.checked },
                          index
                        )
                      }
                      type="checkbox"
                    />
                    Required
                  </label>
                  {used ? null : (
                    <Badge variant="secondary">Unused in this email</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {variables.length > 0 ? (
        <section className="space-y-2">
          <div>
            <h2 className="font-medium text-sm">Sample values</h2>
            <p className="text-muted-foreground text-xs">
              Used for previews and test sends only. Never used for real sends.
            </p>
          </div>
          <div className="space-y-2">
            {variables.map((variable) => (
              <div className="space-y-1" key={variable.key}>
                <Label className="text-xs" htmlFor={`sample-${variable.key}`}>
                  {variable.label}
                </Label>
                <Input
                  id={`sample-${variable.key}`}
                  onChange={(event) =>
                    onChangeSampleData({
                      ...sampleData,
                      [variable.key]: event.target.value,
                    })
                  }
                  placeholder={placeholders[variable.key]}
                  value={sampleData[variable.key] ?? ""}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
