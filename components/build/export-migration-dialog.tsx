"use client";

import { useState } from "react";
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
import { Check, Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportMigrationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  changes: Array<{ role_id: string; permission: string; action: "add" | "remove" }>;
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) throw new Error("Failed to generate migration");

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
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) setMigrationSql(""); // Reset on close
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Migration</DialogTitle>
          <DialogDescription>
            Review the generated SQL migration file. Run this against your database to apply changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            {isGenerating ? (
                <div className="h-[300px] w-full flex items-center justify-center border rounded-md bg-muted/50">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Textarea
                value={migrationSql}
                readOnly
                className="font-mono text-xs h-[300px] resize-none p-4"
                />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCopy} disabled={isGenerating}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button onClick={handleDownload} disabled={isGenerating}>
              <Download className="h-4 w-4 mr-2" />
              Download .sql
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
