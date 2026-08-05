"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FieldMetadata } from "@/lib/build/table-wizard/types";

interface AIAssistantProps {
  description: string;
  onGenerate: (fields: FieldMetadata[]) => void;
  type: "fields" | "relationships" | "policies";
}

export function AIAssistant({
  type,
  description,
  onGenerate,
}: AIAssistantProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/generate-table-fields", {
        body: JSON.stringify({ description, type }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate fields");
      }

      const data = await response.json();
      onGenerate(data.fields || []);
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (type !== "fields") {
    return null; // Only fields generation for now
  }

  return (
    <Button
      disabled={loading || !description.trim()}
      onClick={handleGenerate}
      size="sm"
      type="button"
      variant="outline"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Fields with AI
        </>
      )}
    </Button>
  );
}
