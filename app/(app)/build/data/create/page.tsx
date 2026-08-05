"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

export default function CreateTablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    id: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tables", {
        body: JSON.stringify({
          config: {},
          description: formData.description || undefined,
          id: formData.id,
          name: formData.name,
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create table");
      }

      const { table } = await response.json();
      router.push(`/build/data/${table.id}/config`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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

    // Auto-generate ID from name if ID is empty
    if (name === "name" && !formData.id) {
      const generatedId = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setFormData((prev) => ({
        ...prev,
        id: generatedId,
      }));
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Table</CardTitle>
          <CardDescription>
            Create a new database table configuration. You can configure
            columns, relationships, and access policies after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!!error && (
              <div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="id">Table ID</Label>
              <Input
                id="id"
                maxLength={64}
                name="id"
                onChange={handleChange}
                pattern="[a-z0-9_-]+"
                placeholder="my_table"
                required
                value={formData.id}
              />
              <p className="text-muted-foreground text-xs">
                Lowercase alphanumerics, hyphens, and underscores only. Used for
                API routes and internal references.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Table Name</Label>
              <Input
                id="name"
                maxLength={120}
                name="name"
                onChange={handleChange}
                placeholder="My Table"
                required
                value={formData.name}
              />
              <p className="text-muted-foreground text-xs">
                Display name for the table.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                maxLength={512}
                name="description"
                onChange={handleChange}
                placeholder="A brief description of what this table stores..."
                rows={3}
                value={formData.description}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                disabled={loading}
                onClick={() => router.back()}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={loading} type="submit">
                {loading ? "Creating..." : "Create Table"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
