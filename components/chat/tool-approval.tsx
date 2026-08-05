"use client";

import type { ChatAddToolApproveResponseFunction, UIToolInvocation } from "ai";
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { updateDocument } from "@/lib/ai/tools/update-document";

interface ToolApprovalProps {
  addToolApprovalResponse: ChatAddToolApproveResponseFunction;
  invocation: UIToolInvocation<ReturnType<typeof updateDocument>>;
}

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
        approved: true,
        id: invocation.approval.id,
      });
    }
  };

  const handleDeny = () => {
    if (invocation.approval) {
      addToolApprovalResponse({
        approved: false,
        id: invocation.approval.id,
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
            <span className="font-medium text-sm">Tool:</span>{" "}
            <span className="text-muted-foreground text-sm">
              Update Document
            </span>
          </div>
          <div>
            <span className="font-medium text-sm">Document ID:</span>{" "}
            <span className="font-mono text-muted-foreground text-sm">
              {invocation.input.id}
            </span>
          </div>
          <div>
            <span className="font-medium text-sm">Description:</span>{" "}
            <span className="text-muted-foreground text-sm">
              {invocation.input.description}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleApprove}
          size="sm"
          variant="primary"
        >
          <CheckCircleIcon className="mr-2 size-4" />
          Approve
        </Button>
        <Button
          className="flex-1"
          onClick={handleDeny}
          size="sm"
          variant="outline"
        >
          Deny
        </Button>
      </CardFooter>
    </Card>
  );
}
