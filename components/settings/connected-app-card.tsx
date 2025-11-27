import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

type Tone = "neutral" | "brand" | "success" | "danger";

/**
 * Brand color configurations for different integrations
 * Uses the app's design tokens with brand-specific accent colors
 */
export type BrandConfig = {
  /** Primary brand color in hex format */
  primary: string;
  /** Optional secondary brand color */
  secondary?: string;
  /** CSS class for icon container background/border */
  iconClassName: string;
  /** CSS class for status pill when connected */
  statusClassName: string;
  /** CSS class for tag chips */
  chipClassName: string;
};

const toneClasses: Record<Tone, string> = {
  neutral: "border-border/70 transition-shadow hover:shadow-md",
  brand: "border-blue-300/80 shadow-[0_0_20px_rgba(59,130,246,0.08)] transition-shadow hover:shadow-[0_0_24px_rgba(59,130,246,0.12)]",
  success: "border-emerald-300/80 shadow-[0_0_20px_rgba(16,185,129,0.08)] transition-shadow hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]",
  danger: "border-rose-300/80 shadow-[0_0_20px_rgba(244,63,94,0.08)] transition-shadow hover:shadow-[0_0_24px_rgba(244,63,94,0.12)]",
};

export type ConnectedAppCardProps = {
  title: string;
  description: string;
  /** Connection status (e.g., "Connected", "Not connected") */
  status?: string;
  statusVariant?: BadgeVariant;
  /** Additional status detail (e.g., "Last synced 2h ago") */
  statusDetail?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Additional actions displayed in the header (e.g., badges, links) */
  actions?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  headerClassName?: string;
  tone?: Tone;
  /** @deprecated Use brandConfig instead for better brand integration */
  iconAccentClassName?: string;
  /** Brand configuration for consistent styling */
  brandConfig?: BrandConfig;
  /** Optional tags to display (e.g., ["Production", "Primary"]) */
  tags?: string[];
  /** Whether the connection is verified */
  verified?: boolean;
  /** Error message to display */
  error?: string;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
};

export function ConnectedAppCard({
  title,
  description,
  status,
  statusVariant,
  statusDetail,
  icon,
  children,
  actions,
  footer,
  headerClassName,
  tone = "neutral",
  iconAccentClassName,
  brandConfig,
  tags,
  verified,
  error,
  isLoading,
}: ConnectedAppCardProps) {
  // Use brandConfig if provided, otherwise fall back to iconAccentClassName
  const iconClassName = brandConfig?.iconClassName ?? iconAccentClassName;
  const statusPillClassName = brandConfig?.statusClassName;

  // Determine the actual status variant based on brandConfig
  const actualStatusVariant = statusVariant ?? (status === "Connected" ? "secondary" : "outline");

  return (
    <Card
      className={cn(
        "shadow-sm min-h-[160px] transition-all duration-200",
        toneClasses[tone],
        error && "border-destructive/50"
      )}
      role="region"
      aria-label={`${title} integration settings`}
    >
      <CardHeader
        className={cn(
          "flex flex-col gap-4 border-b bg-muted/30 p-4 sm:flex-row sm:items-start sm:justify-between",
          headerClassName
        )}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {icon ? (
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border text-primary shadow-sm transition-transform hover:scale-105",
                iconClassName
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold leading-tight">
                {title}
              </CardTitle>
              {verified ? (
                <CheckCircle2
                  className="size-4 text-emerald-600 dark:text-emerald-400"
                  aria-label="Verified"
                />
              ) : null}
            </div>
            <CardDescription className="text-sm leading-relaxed mt-1 max-w-[280px]">
              {description.length > 120 ? `${description.slice(0, 117)}...` : description}
            </CardDescription>
            {tags && tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label="Integration tags">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                      brandConfig?.chipClassName ?? "border-border bg-background text-foreground"
                    )}
                    role="listitem"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground sm:items-end shrink-0">
          {status ? (
            <Badge
              variant={actualStatusVariant}
              className={cn(
                "gap-1.5 min-h-[24px] transition-colors",
                statusPillClassName,
                status === "Connected" && "gap-1"
              )}
            >
              {status === "Connected" ? (
                <CheckCircle2 className="size-3" aria-hidden="true" />
              ) : status === "Not connected" ? (
                <XCircle className="size-3" aria-hidden="true" />
              ) : null}
              {status}
            </Badge>
          ) : null}
          {statusDetail && !error ? (
            <span className="text-xs">{statusDetail}</span>
          ) : null}
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-4">
        {error ? (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive flex items-start gap-2"
            role="alert"
            aria-live="polite"
          >
            <XCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}
        {isLoading ? (
          <div className="space-y-3 animate-pulse" aria-label="Loading">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : (
          children
        )}
      </CardContent>
      {footer ? (
        <div className="border-t bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}


