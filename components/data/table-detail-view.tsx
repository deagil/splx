"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Table2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FieldType =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox";

type FieldUIHints = {
  field_type?: FieldType;
  placeholder?: string;
  help_text?: string;
  format?: "default" | "currency" | "percentage" | "integer";
};

type FieldMetadata = {
  field_name: string;
  display_name?: string;
  description?: string;
  data_type?: string;
  ui_hints?: FieldUIHints;
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

type FieldTypeOption = {
  value: FieldType;
  label: string;
  description?: string;
};

type TableDetailViewProps = {
  tableName: string;
};

const TEXT_FIELD_OPTIONS: FieldTypeOption[] = [
  { value: "text", label: "Text", description: "Plain text or labels" },
  { value: "email", label: "Email", description: "Email address validation" },
  { value: "phone", label: "Phone", description: "Phone number formatting" },
  { value: "url", label: "Link", description: "URL with link preview" },
  { value: "textarea", label: "Long text", description: "Multi-line input" },
  { value: "select", label: "Dropdown", description: "Choose from options" },
];

const NUMBER_FIELD_OPTIONS: FieldTypeOption[] = [
  { value: "number", label: "Number", description: "Numeric input with validation" },
];

const DATE_FIELD_OPTIONS: FieldTypeOption[] = [
  { value: "date", label: "Date / time", description: "Date or timestamp input" },
];

const BOOLEAN_FIELD_OPTIONS: FieldTypeOption[] = [
  { value: "checkbox", label: "Checkbox", description: "True/false toggle" },
];

const JSON_FIELD_OPTIONS: FieldTypeOption[] = [
  { value: "textarea", label: "Long text", description: "JSON displayed as text" },
];

const ID_FIELD_OPTIONS: FieldTypeOption[] = [
  { value: "text", label: "Identifier", description: "Read-only text value" },
];

const normalizeDataType = (dataType: string) => dataType.toLowerCase();

const getFieldTypeOptions = (column: ColumnInfo): FieldTypeOption[] => {
  const type = normalizeDataType(column.data_type);

  if (type.includes("bool")) {
    return BOOLEAN_FIELD_OPTIONS;
  }

  if (type.includes("timestamp") || type.includes("date") || type.includes("time")) {
    return DATE_FIELD_OPTIONS;
  }

  if (
    type.includes("int") ||
    type.includes("numeric") ||
    type.includes("decimal") ||
    type.includes("double") ||
    type.includes("real")
  ) {
    return NUMBER_FIELD_OPTIONS;
  }

  if (type.includes("uuid")) {
    return ID_FIELD_OPTIONS;
  }

  if (type.includes("json")) {
    return JSON_FIELD_OPTIONS;
  }

  return TEXT_FIELD_OPTIONS;
};

const guessFieldType = (
  column: ColumnInfo,
  metadata: FieldMetadata | undefined,
  options: FieldTypeOption[]
): FieldType => {
  const available = new Set(options.map((option) => option.value));

  if (metadata?.ui_hints?.field_type && available.has(metadata.ui_hints.field_type)) {
    return metadata.ui_hints.field_type;
  }

  const name = column.column_name.toLowerCase();
  const type = normalizeDataType(column.data_type);
  const pick = (value: FieldType) => (available.has(value) ? value : options[0]?.value ?? "text");

  if (available.has("checkbox") && (type.includes("bool") || name.startsWith("is_") || name.startsWith("has_"))) {
    return "checkbox";
  }

  if (available.has("date") && (type.includes("timestamp") || type.includes("date") || name.endsWith("_at"))) {
    return "date";
  }

  if (available.has("email") && name.includes("email")) {
    return "email";
  }

  if (available.has("phone") && name.includes("phone")) {
    return "phone";
  }

  if (available.has("url") && (name.includes("url") || name.includes("link"))) {
    return "url";
  }

  if (available.has("number") && (type.includes("int") || type.includes("numeric") || type.includes("decimal"))) {
    return "number";
  }

  return pick(options[0]?.value ?? "text");
};

const applyFieldDefaults = (
  column: ColumnInfo,
  incoming: FieldMetadata | undefined
): FieldMetadata => {
  const options = getFieldTypeOptions(column);
  const guessedType = guessFieldType(column, incoming, options);
  const nextUiHints: FieldUIHints = {
    ...incoming?.ui_hints,
    field_type: incoming?.ui_hints?.field_type ?? guessedType,
    format: incoming?.ui_hints?.format ?? "default",
  };

  return {
    field_name: column.column_name,
    display_name: incoming?.display_name ?? column.column_name,
    description: incoming?.description ?? "",
    data_type: incoming?.data_type ?? column.data_type,
    ui_hints: nextUiHints,
  };
};

export function TableDetailView({ tableName }: TableDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [tableConfig, setTableConfig] = useState<TableMetadata | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [columnSearch, setColumnSearch] = useState("");
  const [initialized, setInitialized] = useState(false);
  const lastSavedHashRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [fieldMetadata, setFieldMetadata] = useState<Record<string, FieldMetadata>>({});

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTableData() {
      setLoading(true);
      setError(null);

      try {
        const configResponse = await fetch(`/api/tables/${tableName}`, {
          credentials: "same-origin",
        });

        const metadataMap: Record<string, FieldMetadata> = {};

        if (configResponse.ok) {
          const { table } = await configResponse.json();
          setTableConfig(table);
          setFormData({
            name: table.name,
            description: table.description || "",
          });

          if (table.config?.field_metadata) {
            for (const field of table.config.field_metadata) {
              metadataMap[field.field_name] = field;
            }
          }
        } else {
          setFormData({
            name: tableName,
            description: "",
          });
        }

        const columnsResponse = await fetch(`/api/data/${tableName}/schema`, {
          credentials: "same-origin",
        });

        if (!columnsResponse.ok) {
          throw new Error("Failed to load table schema");
        }

        const { columns: tableColumns } = await columnsResponse.json();
        setColumns(tableColumns);

        const hydratedMetadata: Record<string, FieldMetadata> = {};

        for (const column of tableColumns) {
          hydratedMetadata[column.column_name] = applyFieldDefaults(
            column,
            metadataMap[column.column_name]
          );
        }

        setFieldMetadata(hydratedMetadata);
        setSelectedColumn((prev) => prev ?? tableColumns[0]?.column_name ?? null);
        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while loading the table");
      } finally {
        setLoading(false);
      }
    }

    if (tableName) {
      void loadTableData();
    }
  }, [tableName]);

  const payload = useMemo(() => {
    const field_metadata = Object.values(fieldMetadata)
      .map((field) => ({
        ...field,
        field_name: field.field_name,
      }))
      .sort((a, b) => a.field_name.localeCompare(b.field_name));

    return {
      name: formData.name,
      description: formData.description || null,
      config: {
        ...tableConfig?.config,
        field_metadata,
      },
    };
  }, [fieldMetadata, formData.description, formData.name, tableConfig?.config]);

  const payloadHash = useMemo(() => JSON.stringify(payload), [payload]);

  const saveChanges = useCallback(
    async (
      reason: "autosave" | "manual" = "autosave",
      nextPayload: typeof payload = payload,
      nextHash: string = payloadHash
    ) => {
      if (!initialized) {
        return;
      }

      if (reason === "autosave" && nextHash === lastSavedHashRef.current) {
        return;
      }

      setSaveState("saving");
      setSaveError(null);

      try {
        const method = tableConfig ? "PATCH" : "POST";
        const url = tableConfig ? `/api/tables/${tableName}` : "/api/tables";

        const body = tableConfig
          ? nextPayload
          : {
              id: tableName,
              ...nextPayload,
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
        lastSavedHashRef.current = nextHash;
        setSaveState("saved");

        if (reason === "manual") {
          toast.success("Table metadata saved");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred while saving";
        setSaveState("error");
        setSaveError(errorMessage);

        if (reason === "manual") {
          toast.error(errorMessage);
        }
      }
    },
    [initialized, payload, payloadHash, tableConfig, tableName]
  );

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (lastSavedHashRef.current === null) {
      lastSavedHashRef.current = payloadHash;
    }
  }, [initialized, payloadHash]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (payloadHash === lastSavedHashRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveChanges("autosave", payload, payloadHash);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [initialized, payload, payloadHash, saveChanges]);

  const filteredColumns = useMemo(() => {
    const query = columnSearch.trim().toLowerCase();
    if (!query) {
      return columns;
    }

    return columns.filter((column) => {
      const meta = fieldMetadata[column.column_name];
      return (
        column.column_name.toLowerCase().includes(query) ||
        meta?.display_name?.toLowerCase().includes(query)
      );
    });
  }, [columnSearch, columns, fieldMetadata]);

  const selectedColumnInfo = useMemo(
    () => columns.find((column) => column.column_name === selectedColumn),
    [columns, selectedColumn]
  );

  const selectedColumnMetadata = selectedColumn
    ? fieldMetadata[selectedColumn]
    : undefined;

  const saveStatus = useMemo(() => {
    if (saveState === "saving") {
      return { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: "Saving..." };
    }

    if (saveState === "saved") {
      return { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, label: "Saved" };
    }

    if (saveState === "error") {
      return { icon: <AlertCircle className="h-4 w-4 text-destructive" />, label: "Save failed" };
    }

    return { icon: <RefreshCw className="h-4 w-4 text-muted-foreground" />, label: "Idle" };
  }, [saveState]);

  const handleFieldMetadataChange = (
    fieldName: string,
    key: keyof FieldMetadata | string,
    value: string
  ) => {
    setFieldMetadata((prev) => {
      const field = prev[fieldName] || { field_name: fieldName };
      const column = columns.find((col) => col.column_name === fieldName);
      const withDefaults = column ? applyFieldDefaults(column, field) : field;

      if (key.startsWith("ui_hints.")) {
        const uiKey = key.replace("ui_hints.", "");
        return {
          ...prev,
          [fieldName]: {
            ...withDefaults,
            ui_hints: {
              ...withDefaults.ui_hints,
              [uiKey]: value,
            },
          },
        };
      }

      return {
        ...prev,
        [fieldName]: {
          ...withDefaults,
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
      <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <Button variant="ghost" size="sm" asChild className="h-9 px-3">
            <Link href="/data/tables">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tables
            </Link>
          </Button>
          <div className="rounded-md bg-primary/10 p-2">
            <Table2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor="header-display-name" className="sr-only">
              Table display name
            </Label>
            <Input
              id="header-display-name"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Table name"
              maxLength={120}
              className="h-10 min-w-0 border-none bg-transparent px-0 text-3xl font-bold leading-tight shadow-none outline-none focus-visible:ring-0 md:text-4xl"
            />
            <Label htmlFor="header-description" className="sr-only">
              Table description
            </Label>
            <Input
              id="header-description"
              value={formData.description}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Add a short description"
              maxLength={512}
              className="h-7 min-w-0 border-none bg-transparent px-0 text-sm text-muted-foreground leading-snug shadow-none outline-none focus-visible:ring-0"
            />
            <p className="text-xs font-mono text-muted-foreground">{tableName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            {saveStatus.icon}
            <span>{saveStatus.label}</span>
            {saveState === "error" && saveError ? (
              <span className="text-destructive">{saveError}</span>
            ) : null}
          </div>
          <Button
            variant={saveState === "error" ? "destructive" : "outline"}
            size="sm"
            onClick={() => saveChanges("manual")}
          >
            <Save className="mr-2 h-4 w-4" />
            Save now
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5 xl:col-span-4">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Columns</CardTitle>
              <CardDescription>Search and select a column to edit.</CardDescription>
              <Input
                value={columnSearch}
                onChange={(event) => setColumnSearch(event.target.value)}
                placeholder="Search columns..."
                className="mt-3"
              />
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <ScrollArea className="h-[520px]">
                <div className="space-y-2">
                  {filteredColumns.map((column) => {
                    const metadata = fieldMetadata[column.column_name];
                    const isActive = selectedColumn === column.column_name;
                    const required = column.is_nullable === "NO";

                    return (
                      <button
                        key={column.column_name}
                        type="button"
                        onClick={() => setSelectedColumn(column.column_name)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                          "hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          isActive ? "border-primary bg-primary/5" : "border-border bg-card/80"
                        )}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">
                              {metadata?.display_name || column.column_name}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              {column.column_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {required ? (
                              <Badge size="xs" appearance="light" variant="destructive">
                                Required
                              </Badge>
                            ) : null}
                            <Badge size="xs" appearance="light" variant="info">
                              {column.data_type}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredColumns.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      No columns match your search.
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Column settings</CardTitle>
              <CardDescription>
                Configure how this column is labeled and rendered in forms.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedColumnInfo && selectedColumnMetadata ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="xs" appearance="light" variant="info" className="uppercase">
                      {selectedColumnInfo.data_type}
                    </Badge>
                    {selectedColumnInfo.is_nullable === "NO" ? (
                      <Badge size="xs" appearance="light" variant="destructive">
                        Required
                      </Badge>
                    ) : (
                      <Badge size="xs" appearance="light" variant="secondary">
                        Optional
                      </Badge>
                    )}
                    <span className="text-xs font-mono text-muted-foreground">
                      {selectedColumnInfo.column_name}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="column-display-name">Display name</Label>
                      <Input
                        id="column-display-name"
                        value={selectedColumnMetadata.display_name || ""}
                        onChange={(event) =>
                          handleFieldMetadataChange(
                            selectedColumnInfo.column_name,
                            "display_name",
                            event.target.value
                          )
                        }
                        placeholder={selectedColumnInfo.column_name}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="column-field-type">Field type</Label>
                      <Select
                        value={selectedColumnMetadata.ui_hints?.field_type || "text"}
                        onValueChange={(value) =>
                          handleFieldMetadataChange(
                            selectedColumnInfo.column_name,
                            "ui_hints.field_type",
                            value
                          )
                        }
                      >
                        <SelectTrigger id="column-field-type" className="h-10">
                          <SelectValue placeholder="Choose type" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {getFieldTypeOptions(selectedColumnInfo).map((option) => (
                            <SelectItem key={option.value} value={option.value} className="py-2">
                              <div className="flex flex-col text-left">
                                <span className="text-sm font-medium">{option.label}</span>
                                {option.description ? (
                                  <span className="text-xs text-muted-foreground">
                                    {option.description}
                                  </span>
                                ) : null}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="column-description">Description</Label>
                    <Textarea
                      id="column-description"
                      value={selectedColumnMetadata.description || ""}
                      onChange={(event) =>
                        handleFieldMetadataChange(
                          selectedColumnInfo.column_name,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Describe how this field should be used"
                      rows={3}
                    />
                  </div>

                  {selectedColumnMetadata.ui_hints?.field_type === "number" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="number-format">Number format</Label>
                        <Select
                          value={selectedColumnMetadata.ui_hints.format || "default"}
                          onValueChange={(value) =>
                            handleFieldMetadataChange(
                              selectedColumnInfo.column_name,
                              "ui_hints.format",
                              value
                            )
                          }
                        >
                          <SelectTrigger id="number-format">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Standard</SelectItem>
                            <SelectItem value="currency">Currency</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="integer">Integer</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose how numeric values should be formatted.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number-placeholder">Placeholder</Label>
                        <Input
                          id="number-placeholder"
                          value={selectedColumnMetadata.ui_hints.placeholder || ""}
                          onChange={(event) =>
                            handleFieldMetadataChange(
                              selectedColumnInfo.column_name,
                              "ui_hints.placeholder",
                              event.target.value
                            )
                          }
                          placeholder="e.g. $0.00"
                        />
                      </div>
                    </div>
                  ) : null}

                  {selectedColumnMetadata.ui_hints?.field_type &&
                  selectedColumnMetadata.ui_hints.field_type !== "number" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="text-placeholder">Placeholder</Label>
                        <Input
                          id="text-placeholder"
                          value={selectedColumnMetadata.ui_hints.placeholder || ""}
                          onChange={(event) =>
                            handleFieldMetadataChange(
                              selectedColumnInfo.column_name,
                              "ui_hints.placeholder",
                              event.target.value
                            )
                          }
                          placeholder="Enter a value"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="text-help">Help text</Label>
                        <Input
                          id="text-help"
                          value={selectedColumnMetadata.ui_hints.help_text || ""}
                          onChange={(event) =>
                            handleFieldMetadataChange(
                              selectedColumnInfo.column_name,
                              "ui_hints.help_text",
                              event.target.value
                            )
                          }
                          placeholder="Shown beside the field in forms"
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Select a column from the list to edit its settings.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
