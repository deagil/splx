"use client";

import type { ReactNode } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";

import type { Integration, IntegrationStatus } from "@/lib/integrations/registry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IntegrationListItemProps = {
  integration: Integration;
  status: IntegrationStatus;
  icon: ReactNode;
  onConfigure: () => void;
};

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
        "hover:shadow-md hover:border-border/80",
        isConnected && "border-emerald-200/50 dark:border-emerald-800/30"
      )}
    >
      {/* Main row: Icon + Name + Actions */}
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-105",
            integration.brandConfig.iconClassName
          )}
          aria-hidden="true"
        >
          {icon}
        </div>

        {/* Name and mobile description */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{integration.name}</h3>
          {/* Description shown inline on larger screens */}
          <p className="hidden sm:block text-sm text-muted-foreground mt-0.5">
            {integration.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {integration.learnMoreUrl ? (
            <a
              href={integration.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Learn more
              <ExternalLink className="size-3" />
            </a>
          ) : null}

          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onConfigure}
              className={cn(
                "gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
                "dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
              )}
            >
              <CheckCircle2 className="size-3.5" />
              <span className="hidden sm:inline">Connected</span>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onConfigure}
              disabled={isLoading || !integration.configurable}
            >
              {isLoading ? "..." : "Connect"}
            </Button>
          )}
        </div>
      </div>

      {/* Description shown below on mobile */}
      <p className="sm:hidden text-sm text-muted-foreground mt-3 pl-16">
        {integration.description}
      </p>
    </div>
  );
}

