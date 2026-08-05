"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type {
  Integration,
  IntegrationStatus,
} from "@/lib/integrations/registry";
import { cn } from "@/lib/utils";

interface IntegrationListItemProps {
  icon: ReactNode;
  integration: Integration;
  onConfigure: () => void;
  status: IntegrationStatus;
}

export function IntegrationListItem({
  integration,
  status,
  icon,
  onConfigure,
}: IntegrationListItemProps) {
  const isConnected = status === "connected";
  const isLoading = status === "loading";

  return (
    <div
      className={cn(
        "group rounded-xl border bg-card p-4 transition-all duration-200",
        "hover:border-border/80 hover:shadow-md",
        isConnected && "border-emerald-200/50 dark:border-emerald-800/30"
      )}
    >
      {/* Main row: Icon + Name + Actions */}
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          aria-hidden="true"
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-105",
            integration.brandConfig.iconClassName
          )}
        >
          {icon}
        </div>

        {/* Name and mobile description */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">{integration.name}</h3>
          {/* Description shown inline on larger screens */}
          <p className="mt-0.5 hidden text-muted-foreground text-sm sm:block">
            {integration.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-3">
          {integration.learnMoreUrl ? (
            <a
              className="hidden items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground lg:flex"
              href={integration.learnMoreUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Learn more
              <ExternalLink className="size-3" />
            </a>
          ) : null}

          {isConnected ? (
            <Button
              className={cn(
                "gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
                "dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
              )}
              onClick={onConfigure}
              size="sm"
              variant="outline"
            >
              <CheckCircle2 className="size-3.5" />
              <span className="hidden sm:inline">Connected</span>
            </Button>
          ) : (
            <Button
              disabled={isLoading || !integration.configurable}
              onClick={onConfigure}
              size="sm"
              variant="primary"
            >
              {isLoading ? "..." : "Connect"}
            </Button>
          )}
        </div>
      </div>

      {/* Description shown below on mobile */}
      <p className="mt-3 pl-16 text-muted-foreground text-sm sm:hidden">
        {integration.description}
      </p>
    </div>
  );
}
