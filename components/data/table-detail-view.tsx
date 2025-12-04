"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Table2 } from "lucide-react";
import { toast } from "sonner";

type FieldMetadata = {
  field_name: string;
  display_name?: string;
  description?: string;
  data_type?: string;
  ui_hints?: {
    field_type?: "text" | "email" | "phone" | "url" | "number" | "date" | "textarea" | "select" | "checkbox";
    placeholder?: string;
    help_text?: string;
  };
};

type TableConfig = {
  field_metadata?: FieldMetadata[];
};

type TableMetadata = {
  id: string;
  name: string;
  description: string | null;
  config: TableConfig;
};

type ColumnInfo = {
  column_name: string;
  data_type: string;
  is_nullable: string;
};

type TableDetailViewProps = {
  tableName: string;
};

export function TableDetailView({ tableName }: TableDetailViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [tableConfig, setTableConfig] = useState<TableMetadata | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [fieldMetadata, setFieldMetadata] = useState<Record<string, FieldMetadata>>({});

  useEffect(() => {
    async function loadTableData() {
      setLoading(true);
      setError(null);

      try {
        // Load table config
        const configResponse = await fetch(`/api/tables/${tableName}`, {
          credentials: "same-origin",
        });

        let config: TableMetadata | null = null;
        if (configResponse.ok) {
          const { table } = await configResponse.json();
          config = table;
          setTableConfig(table);
          setFormData({
            name: table.name,
            description: table.description || "",
          });

          // Convert field_metadata array to map for easier editing
          const metadataMap: Record<string, FieldMetadata> = {};
          if (table.config?.field_metadata) {
            for (const field of table.config.field_metadata) {
              metadataMap[field.field_name] = field;
            }
          }
          setFieldMetadata(metadataMap);
        } else {
          // Table config doesn't exist yet, will create on save
          setFormData({
            name: tableName,
            description: "",
          });
        }

        // Load actual table columns from database
        const columnsResponse = await fetch(`/api/data/${tableName}/schema`, {
          credentials: "same-origin",
        });

        if (!columnsResponse.ok) {
          throw new Error("Failed to load table schema");
        }

        const { columns: tableColumns } = await columnsResponse.json();
        setColumns(tableColumns);

        // Initialize field metadata for columns that don't have it
        const newMetadataMap = { ...metadataMap };
        for (const col of tableColumns) {
          if (!newMetadataMap[col.column_name]) {
            newMetadataMap[col.column_name] = {
              field_name: col.column_name,
              display_name: col.column_name,
              data_type: col.data_type,
            };
          }
        }
        setFieldMetadata(newMetadataMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (tableName) {
      loadTableData();
    }
  }, [tableName]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const field_metadata = Object.values(fieldMetadata);

      const payload = {
        name: formData.name,
        description: formData.description || null,
        config: {
          ...tableConfig?.config,
          field_metadata,
        },
      };

      const method = tableConfig ? "PATCH" : "POST";
      const url = tableConfig ? `/api/tables/${tableName}` : "/api/tables";

      const body = tableConfig
        ? payload
        : {
            id: tableName,
            ...payload,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save table metadata");
      }

      const { table } = await response.json();
      setTableConfig(table);

      toast.success("Table metadata saved successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldMetadataChange = (
    fieldName: string,
    key: keyof FieldMetadata | string,
    value: string
  ) => {
    setFieldMetadata((prev) => {
      const field = prev[fieldName] || { field_name: fieldName };

      if (key.startsWith("ui_hints.")) {
        const uiKey = key.replace("ui_hints.", "");
        return {
          ...prev,
          [fieldName]: {
            ...field,
            ui_hints: {
              ...field.ui_hints,
              [uiKey]: value,
            },
          },
        };
      }

      return {
        ...prev,
        [fieldName]: {
          ...field,
          [key]: value,
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && columns.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/data/tables">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tables
          </Link>
        </Button>
        <div className="rounded-md border border-dashed border-destructive/60 p-8 text-center">
          <p className="font-semibold text-destructive">Failed to load table</p>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/data/tables">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tables
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Table2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{formData.name || tableName}</h1>
              <p className="text-sm text-muted-foreground font-mono">{tableName}</p>
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Table Details</CardTitle>
          <CardDescription>
            Configure the display name and description for this table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter a friendly name for this table"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown in the UI instead of the technical table name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe what data this table contains"
              maxLength={512}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Help others understand the purpose of this table.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Column Configuration</CardTitle>
          <CardDescription>
            Configure display names, descriptions, and field types for each column. Field
            types control how the data is displayed and edited in forms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {columns.map((column) => {
              const metadata = fieldMetadata[column.column_name] || {
                field_name: column.column_name,
              };

              return (
                <div
                  key={column.column_name}
                  className="border rounded-lg p-4 space-y-4 bg-muted/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold">
                        {column.column_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {column.data_type}
                        {column.is_nullable === "NO" && (
                          <span className="ml-2 text-destructive">required</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${column.column_name}-display`}>
                        Display Name
                      </Label>
                      <Input
                        id={`${column.column_name}-display`}
                        value={metadata.display_name || ""}
                        onChange={(e) =>
                          handleFieldMetadataChange(
                            column.column_name,
                            "display_name",
                            e.target.value
                          )
                        }
                        placeholder={column.column_name}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${column.column_name}-type`}>Field Type</Label>
                      <Select
                        value={metadata.ui_hints?.field_type || "text"}
                        onValueChange={(value) =>
                          handleFieldMetadataChange(
                            column.column_name,
                            "ui_hints.field_type",
                            value
                          )
                        }
                      >
                        <SelectTrigger id={`${column.column_name}-type`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone Number</SelectItem>
                          <SelectItem value="url">URL/Link</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${column.column_name}-description`}>
                      Description
                    </Label>
                    <Textarea
                      id={`${column.column_name}-description`}
                      value={metadata.description || ""}
                      onChange={(e) =>
                        handleFieldMetadataChange(
                          column.column_name,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Describe this field"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
