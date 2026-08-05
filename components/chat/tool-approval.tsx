"use client";

import type { ChatAddToolApproveResponseFunction, UIToolInvocation } from "ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import type { updateDocument } from "@/lib/ai/tools/update-document";

type ToolApprovalProps = {
  invocation: UIToolInvocation<ReturnType<typeof updateDocument>>;
  addToolApprovalResponse: ChatAddToolApproveResponseFunction;
};

/**
 * Tool approval component for handling human-in-the-loop tool execution.
 * 
 * Displays approval UI when a tool requires user approval before execution.
 * Used for sensitive operations like document updates.
 */
export function ToolApproval({
  invocation,
  addToolApprovalResponse,
}: ToolApprovalProps) {
  if (invocation.state !== "approval-requested") {
    return null;
  }

  const handleApprove = () => {
    if (invocation.approval) {
      addToolApprovalResponse({
        id: invocation.approval.id,
        approved: true,
      });
    }
  };

  const handleDeny = () => {
    if (invocation.approval) {
      addToolApprovalResponse({
        id: invocation.approval.id,
        approved: false,
      });
    }
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircleIcon className="size-5 text-yellow-600 dark:text-yellow-400" />
          <CardTitle>Approval Required</CardTitle>
        </div>
        <CardDescription>
          This tool requires your approval before execution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium">Tool:</span>{" "}
            <span className="text-sm text-muted-foreground">Update Document</span>
          </div>
          <div>
            <span className="text-sm font-medium">Document ID:</span>{" "}
            <span className="text-sm text-muted-foreground font-mono">
              {invocation.input.id}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium">Description:</span>{" "}
            <span className="text-sm text-muted-foreground">
              {invocation.input.description}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          onClick={handleApprove}
          size="sm"
          variant="primary"
          className="flex-1"
        >
          <CheckCircleIcon className="mr-2 size-4" />
          Approve
        </Button>
        <Button
          onClick={handleDeny}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          Deny
        </Button>
      </CardFooter>
    </Card>
  );
}

