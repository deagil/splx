"use client";

import { Copy, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ExportMigrationDialogProps {
  changes: Array<{
    role_id: string;
    permission: string;
    action: "add" | "remove";
  }>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportMigrationDialog({
  isOpen,
  onOpenChange,
  changes,
}: ExportMigrationDialogProps) {
  const [migrationSql, setMigrationSql] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMigration = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/dev/roles/export", {
        body: JSON.stringify({ changes }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate migration");
      }

      const data = await response.json();
      setMigrationSql(data.content);
      setFilename(data.filename);
    } catch (error) {
      toast.error("Error generating migration SQL");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate when dialog opens
  if (isOpen && !migrationSql && !isGenerating && changes.length > 0) {
    generateMigration();
  } else if (isOpen && changes.length === 0 && !migrationSql) {
    setMigrationSql("-- No changes detected to export.");
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(migrationSql);
    toast.success("Copied to clipboard");
  };

  const handleDownload = () => {
    const blob = new Blob([migrationSql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "migration.sql";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setMigrationSql(""); // Reset on close
        }
      }}
      open={isOpen}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Migration</DialogTitle>
          <DialogDescription>
            Review the generated SQL migration file. Run this against your
            database to apply changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            {isGenerating ? (
              <div className="flex h-[300px] w-full items-center justify-center rounded-md border bg-muted/50">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Textarea
                className="h-[300px] resize-none p-4 font-mono text-xs"
                readOnly
                value={migrationSql}
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              disabled={isGenerating}
              onClick={handleCopy}
              variant="secondary"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button disabled={isGenerating} onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download .sql
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
