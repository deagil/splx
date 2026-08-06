"use client";

import type { EveMessagePart } from "eve/react";
import { KeyRoundIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AuthorizationPart({
  part,
}: {
  part: Extract<EveMessagePart, { type: "authorization" }>;
}) {
  if (part.state === "completed") {
    return (
      <Alert>
        <KeyRoundIcon />
        <AlertTitle>
          {part.outcome === "authorized"
            ? `${part.displayName} connected`
            : `${part.displayName} authorization ${part.outcome}`}
        </AlertTitle>
        {part.reason ? (
          <AlertDescription>{part.reason}</AlertDescription>
        ) : null}
      </Alert>
    );
  }

  return (
    <Alert>
      <KeyRoundIcon />
      <AlertTitle>{part.displayName}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{part.description}</p>
        {part.authorization?.instructions ? (
          <p>{part.authorization.instructions}</p>
        ) : null}
        {part.authorization?.userCode ? (
          <code className="w-fit rounded bg-muted px-2 py-1 text-foreground">
            {part.authorization.userCode}
          </code>
        ) : null}
        {part.authorization?.url ? (
          <a
            className="w-fit underline hover:text-foreground"
            href={part.authorization.url}
            rel="noreferrer"
            target="_blank"
          >
            Sign in →
          </a>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
