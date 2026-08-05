"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTriggerBlockAction } from "../hooks";
import type { TriggerBlockDraft } from "../types";

export interface TriggerBlockViewProps {
  block: TriggerBlockDraft;
}

export function TriggerBlockView({ block }: TriggerBlockViewProps) {
  const [confirmed, setConfirmed] = useState(false);
  const { execute, status, error } = useTriggerBlockAction(block);

  const handleClick = () => {
    if (block.display.requireConfirmation && !confirmed) {
      setConfirmed(true);
      return;
    }
    setConfirmed(false);
    void execute();
  };

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <p className="text-muted-foreground text-sm">
        Trigger hook:{" "}
        <span className="font-mono text-foreground">
          {block.display.hookName || "—"}
        </span>
      </p>
      <Button
        onClick={handleClick}
        type="button"
        variant={
          block.display.actionType === "primary"
            ? "primary"
            : block.display.actionType === "destructive"
              ? "destructive"
              : "outline"
        }
      >
        {block.display.buttonText || "Run action"}
      </Button>
      {block.display.requireConfirmation ? (
        <p className="text-muted-foreground text-xs">
          {confirmed
            ? block.display.confirmationText
            : "Requires confirmation before running."}
        </p>
      ) : null}
      {status === "pending" ? (
        <p className="text-muted-foreground text-xs">Executing…</p>
      ) : null}
      {status === "success" ? (
        <p className="text-emerald-600 text-xs">Trigger executed.</p>
      ) : null}
      {status === "error" && error ? (
        <p className="text-red-600 text-xs">{error}</p>
      ) : null}
    </div>
  );
}
