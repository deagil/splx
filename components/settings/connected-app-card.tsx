import type { VariantProps } from "class-variance-authority";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
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
export interface BrandConfig {
  /** CSS class for tag chips */
  chipClassName: string;
  /** CSS class for icon container background/border */
  iconClassName: string;
  /** Primary brand color in hex format */
  primary: string;
  /** Optional secondary brand color */
  secondary?: string;
  /** CSS class for status pill when connected */
  statusClassName: string;
}

const toneClasses: Record<Tone, string> = {
  brand:
    "border-blue-300/80 shadow-[0_0_20px_rgba(59,130,246,0.08)] transition-shadow hover:shadow-[0_0_24px_rgba(59,130,246,0.12)]",
  danger:
    "border-rose-300/80 shadow-[0_0_20px_rgba(244,63,94,0.08)] transition-shadow hover:shadow-[0_0_24px_rgba(244,63,94,0.12)]",
  neutral: "border-border/70 transition-shadow hover:shadow-md",
  success:
    "border-emerald-300/80 shadow-[0_0_20px_rgba(16,185,129,0.08)] transition-shadow hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]",
};

export interface ConnectedAppCardProps {
  /** Additional actions displayed in the header (e.g., badges, links) */
  actions?: ReactNode;
  /** Brand configuration for consistent styling */
  brandConfig?: BrandConfig;
  children: ReactNode;
  description: string;
  /** Error message to display */
  error?: string;
  /** Footer content */
  footer?: ReactNode;
  headerClassName?: string;
  icon?: ReactNode;
  /** @deprecated Use brandConfig instead for better brand integration */
  iconAccentClassName?: string;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
  /** Connection status (e.g., "Connected", "Not connected") */
  status?: string;
  /** Additional status detail (e.g., "Last synced 2h ago") */
  statusDetail?: string;
  statusVariant?: BadgeVariant;
  /** Optional tags to display (e.g., ["Production", "Primary"]) */
  tags?: string[];
  title: string;
  tone?: Tone;
  /** Whether the connection is verified */
  verified?: boolean;
}

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
  const actualStatusVariant =
    statusVariant ?? (status === "Connected" ? "secondary" : "outline");

  const truncatedDescription =
    description.length > 120 ? `${description.slice(0, 117)}...` : description;

  return (
    <Card
      aria-label={`${title} integration settings`}
      className={cn(
        "min-h-[160px] shadow-sm transition-all duration-200",
        toneClasses[tone],
        error && "border-destructive/50"
      )}
      role="region"
    >
      <CardHeader
        className={cn(
          "flex flex-col gap-4 border-b bg-muted/30 p-4 sm:flex-row sm:items-start sm:justify-between",
          headerClassName
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon ? (
            <div
              aria-hidden="true"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border text-primary shadow-sm transition-transform hover:scale-105",
                iconClassName
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-semibold text-base leading-tight">
                {title}
              </CardTitle>
              {verified ? (
                <CheckCircle2
                  aria-label="Verified"
                  className="size-4 text-emerald-600 dark:text-emerald-400"
                />
              ) : null}
            </div>
            <CardDescription className="mt-1 max-w-[280px] text-sm leading-relaxed">
              {truncatedDescription}
            </CardDescription>
            {tags && tags.length > 0 ? (
              <div
                aria-label="Integration tags"
                className="mt-2 flex flex-wrap gap-1.5"
                role="list"
              >
                {tags.map((tag) => (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs",
                      brandConfig?.chipClassName ??
                        "border-border bg-background text-foreground"
                    )}
                    key={tag}
                    role="listitem"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 text-muted-foreground text-sm sm:items-end">
          {status ? (
            <Badge
              className={cn(
                "min-h-[24px] gap-1.5 transition-colors",
                statusPillClassName,
                status === "Connected" && "gap-1"
              )}
              variant={actualStatusVariant}
            >
              {status === "Connected" ? (
                <CheckCircle2 aria-hidden="true" className="size-3" />
              ) : status === "Not connected" ? (
                <XCircle aria-hidden="true" className="size-3" />
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
            aria-live="polite"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-destructive text-sm"
            role="alert"
          >
            <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {isLoading ? (
          <div aria-label="Loading" className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
          </div>
        ) : (
          children
        )}
      </CardContent>
      {footer ? (
        <div className="border-t bg-muted/40 px-4 py-3 text-muted-foreground text-sm">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
