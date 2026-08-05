"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FieldMetadata,
  WizardStepProps,
} from "@/lib/build/table-wizard/types";
import { AIAssistant } from "../AIAssistant";

const DATA_TYPES = [
  { label: "Text", value: "text" },
  { label: "Integer", value: "integer" },
  { label: "UUID", value: "uuid" },
  { label: "Boolean", value: "boolean" },
  { label: "Timestamp", value: "timestamp" },
  { label: "Date", value: "date" },
  { label: "Numeric", value: "numeric" },
  { label: "JSON", value: "json" },
  { label: "JSONB", value: "jsonb" },
];

export function Step3Fields({ state, updateState }: WizardStepProps) {
  const [expandedField, setExpandedField] = useState<number | null>(null);

  const addField = () => {
    const newField: FieldMetadata = {
      data_type: "text",
      display_name: "",
      field_name: "",
      is_required: false,
      is_unique: false,
    };
    updateState({
      fields: [...state.fields, newField],
    });
    setExpandedField(state.fields.length);
  };

  const removeField = (index: number) => {
    updateState({
      fields: state.fields.filter((_, i) => i !== index),
    });
    if (expandedField === index) {
      setExpandedField(null);
    }
  };

  const updateField = (index: number, updates: Partial<FieldMetadata>) => {
    const newFields = [...state.fields];
    newFields[index] = { ...newFields[index], ...updates };
    updateState({ fields: newFields });
  };

  const handleAIGenerate = (generatedFields: FieldMetadata[]) => {
    updateState({ fields: generatedFields });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2 font-semibold text-2xl">Field Configuration</h2>
          <p className="text-muted-foreground">
            Define the columns/fields for your table. Each field represents a
            piece of data you'll store.
          </p>
        </div>
        <AIAssistant
          description={state.description}
          onGenerate={handleAIGenerate}
          type="fields"
        />
      </div>

      <div className="space-y-3">
        {state.fields.map((field, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="pt-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Field Name</Label>
                      <Input
                        className="font-mono text-sm"
                        onChange={(e) =>
                          updateField(index, {
                            field_name: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_]/g, "_"),
                          })
                        }
                        placeholder="field_name"
                        value={field.field_name}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Display Name</Label>
                      <Input
                        onChange={(e) =>
                          updateField(index, { display_name: e.target.value })
                        }
                        placeholder="Field Name"
                        value={field.display_name || ""}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Data Type</Label>
                      <Select
                        onValueChange={(value) =>
                          updateField(index, { data_type: value })
                        }
                        value={field.data_type || "text"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Default Value (Optional)
                      </Label>
                      <Input
                        onChange={(e) =>
                          updateField(index, { default_value: e.target.value })
                        }
                        placeholder="default"
                        value={(field.default_value as string) || ""}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.is_required || false}
                        id={`required-${index}`}
                        onCheckedChange={(checked) =>
                          updateField(index, { is_required: checked === true })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor={`required-${index}`}
                      >
                        Required
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.is_unique || false}
                        id={`unique-${index}`}
                        onCheckedChange={(checked) =>
                          updateField(index, { is_unique: checked === true })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor={`unique-${index}`}
                      >
                        Unique
                      </Label>
                    </div>
                  </div>
                </div>
                <Button
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeField(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          className="w-full"
          onClick={addField}
          type="button"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Field
        </Button>
      </div>
    </div>
  );
}
