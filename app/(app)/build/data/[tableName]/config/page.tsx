"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface TableConfig {
  config: {
    label_fields?: Array<{ field_name: string; display_name?: string }>;
    relationships?: unknown[];
    field_metadata?: unknown[];
    rls_policy_templates?: unknown[];
    rls_policy_groups?: unknown[];
  };
  description: string | null;
  id: string;
  name: string;
}

export default function TableConfigPage() {
  const params = useParams();
  const _router = useRouter();
  const tableName = params.tableName as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableConfig, setTableConfig] = useState<TableConfig | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    name: "",
  });

  useEffect(() => {
    async function loadTableConfig() {
      try {
        const response = await fetch(`/api/tables/${tableName}`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error("Failed to load table configuration");
        }

        const { table } = await response.json();
        setTableConfig(table);
        setFormData({
          description: table.description || "",
          name: table.name,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (tableName) {
      loadTableConfig();
    }
  }, [tableName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/tables/${tableName}`, {
        body: JSON.stringify({
          description: formData.description || null,
          name: formData.name,
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update table");
      }

      const { table } = await response.json();
      setTableConfig(table);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading table configuration...</div>
      </div>
    );
  }

  if (!tableConfig) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-destructive">
          Table configuration not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Configure Table: {tableConfig.name}</CardTitle>
          <CardDescription>
            Manage table settings, relationships, and access policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs className="w-full" defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
              <TabsTrigger value="policies">RLS Policies</TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-6" value="general">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {!!error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Table Name</Label>
                  <Input
                    id="name"
                    maxLength={120}
                    name="name"
                    onChange={handleChange}
                    required
                    value={formData.name}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    maxLength={512}
                    name="description"
                    onChange={handleChange}
                    rows={3}
                    value={formData.description}
                  />
                </div>

                <div className="flex justify-end">
                  <Button disabled={saving} type="submit">
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="fields">
              <div className="text-muted-foreground text-sm">
                Field metadata configuration coming soon. You can configure
                display names, validation rules, and visibility settings here.
              </div>
            </TabsContent>

            <TabsContent value="relationships">
              <div className="text-muted-foreground text-sm">
                Relationship configuration coming soon. You can configure
                foreign keys and label fields here.
              </div>
            </TabsContent>

            <TabsContent value="policies">
              <div className="text-muted-foreground text-sm">
                RLS policy configuration coming soon. You can configure access
                policies and templates here.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
