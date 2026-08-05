"use client";

import { Database, Import, Layers } from "lucide-react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TableType,
  WizardStepProps,
} from "@/lib/build/table-wizard/types";

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error("Failed to fetch");
  }
  const data = await response.json();
  return data.tables || [];
};

export function Step1TableType({ state, updateState }: WizardStepProps) {
  const { data: tables } = useSWR(
    state.tableType === "view" ? "/api/tables?type=config" : null,
    fetcher
  );

  const tableTypeOptions: Array<{
    value: TableType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      description: "Create a completely new table from scratch",
      icon: Database,
      label: "New Object",
      value: "new",
    },
    {
      description:
        "Create a view or variant of an existing table (e.g., customer/client/lead from a base 'people' table)",
      icon: Layers,
      label: "New Version/View",
      value: "view",
    },
    {
      description: "Import an existing database table and configure it",
      icon: Import,
      label: "Import from Schema",
      value: "import",
    },
  ];

  const handleTableTypeSelect = (value: TableType) => {
    updateState({
      baseTableId: value === "view" ? state.baseTableId : null,
      tableType: value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-2xl">
          What kind of table do you want to create?
        </h2>
        <p className="text-muted-foreground">
          Choose the type of table or object you'd like to create. This
          determines how we'll set up your table structure.
        </p>
      </div>

      <div className="grid gap-4">
        {tableTypeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = state.tableType === option.value;

          return (
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                isSelected ? "border-2 border-primary" : ""
              }`}
              key={option.value}
              onClick={() => handleTableTypeSelect(option.value)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-lg p-3 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 font-semibold">{option.label}</h3>
                    <p className="text-muted-foreground text-sm">
                      {option.description}
                    </p>
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

      {state.tableType === "view" && (
        <div className="space-y-2">
          <Label htmlFor="base-table">Base Table</Label>
          <Select
            onValueChange={(value) => updateState({ baseTableId: value })}
            value={state.baseTableId || ""}
          >
            <SelectTrigger id="base-table">
              <SelectValue placeholder="Select a base table" />
            </SelectTrigger>
            <SelectContent>
              {tables?.map((table: { id: string; name: string }) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Select the existing table to create a view or variant from
          </p>
        </div>
      )}
    </div>
  );
}
