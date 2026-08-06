import type { LucideIcon } from "lucide-react";
import {
  BrainIcon,
  Code2Icon,
  GlobeIcon,
  InfoIcon,
  MessageCircleQuestionIcon,
  NotebookPenIcon,
  SquareArrowOutUpRightIcon,
  ToolCaseIcon,
  WrenchIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ToolIconProps = {
  size?: number;
  className?: string;
  showBackground?: boolean;
};

type LucideIconConfig = {
  kind: "lucide";
  icon: LucideIcon;
  bgClass: string;
  iconClass: string;
  /** Foreground for text drawn on the brand tint (highlights / chips). */
  textClass?: string;
};

type IconConfig = LucideIconConfig;

const iconConfigs: Record<string, IconConfig> = {
  approval: {
    bgClass: "bg-amber-500/15",
    icon: MessageCircleQuestionIcon,
    iconClass: "text-amber-600 dark:text-amber-400",
    kind: "lucide",
  },
  connections: {
    bgClass: "bg-stone-500/15",
    icon: ToolCaseIcon,
    iconClass: "text-stone-600 dark:text-stone-400",
    kind: "lucide",
  },
  development: {
    bgClass: "bg-cyan-500/15",
    icon: Code2Icon,
    iconClass: "text-cyan-600 dark:text-cyan-400",
    kind: "lucide",
  },
  general: {
    bgClass: "bg-muted",
    icon: InfoIcon,
    iconClass: "text-muted-foreground",
    kind: "lucide",
  },
  handoff: {
    bgClass: "bg-sky-500/15",
    icon: SquareArrowOutUpRightIcon,
    iconClass: "text-sky-600 dark:text-sky-400",
    kind: "lucide",
  },
  memory: {
    bgClass: "bg-indigo-500/15",
    icon: BrainIcon,
    iconClass: "text-indigo-600 dark:text-indigo-400",
    kind: "lucide",
  },
  question: {
    bgClass: "bg-violet-500/15",
    icon: MessageCircleQuestionIcon,
    iconClass: "text-violet-600 dark:text-violet-400",
    kind: "lucide",
  },
  reasoning: {
    bgClass: "bg-pink-500/15",
    icon: BrainIcon,
    iconClass: "text-pink-600 dark:text-pink-400",
    kind: "lucide",
  },
  retrieve_tools: {
    bgClass: "bg-taupe-500/15",
    icon: ToolCaseIcon,
    iconClass: "text-taupe-600 dark:text-taupe-400",
    kind: "lucide",
  },
  search: {
    bgClass: "bg-sky-500/15",
    icon: GlobeIcon,
    iconClass: "text-sky-600 dark:text-sky-400",
    kind: "lucide",
  },
  todos: {
    bgClass: "bg-amber-500/15",
    icon: NotebookPenIcon,
    iconClass: "text-amber-600 dark:text-amber-400",
    kind: "lucide",
  },
  unknown: {
    bgClass: "bg-muted",
    icon: WrenchIcon,
    iconClass: "text-muted-foreground",
    kind: "lucide",
  },
  web: {
    bgClass: "bg-sky-500/15",
    icon: GlobeIcon,
    iconClass: "text-sky-600 dark:text-sky-400",
    kind: "lucide",
  },
  web_fetch: {
    bgClass: "bg-sky-500/15",
    icon: GlobeIcon,
    iconClass: "text-sky-600 dark:text-sky-400",
    kind: "lucide",
  },
  web_search: {
    bgClass: "bg-sky-500/15",
    icon: GlobeIcon,
    iconClass: "text-sky-600 dark:text-sky-400",
    kind: "lucide",
  },
};

/** Solid accent fill for progress bars / meters matching the tool category. */
export function getBrandAccentClass(category: string): string {
  switch (normalizeCategory(category)) {
    case "todos":
      return "bg-amber-500";
    case "development":
      return "bg-cyan-500";
    case "memory":
      return "bg-indigo-500";
    case "web":
    case "web_search":
    case "web_fetch":
      return "bg-sky-500";
    case "connections":
      return "bg-stone-500";
    case "question":
      return "bg-violet-500";
    case "reasoning":
      return "bg-pink-500";
    default:
      return "bg-foreground/35";
  }
}

/** Shell tint for tool activity chips. */
export function getBrandTintClass(category: string): string {
  const config = iconConfigs[normalizeCategory(category)];
  return config?.bgClass ?? "bg-muted";
}

/**
 * Text color for labels drawn on a category tint.
 */
export function getBrandTextClass(category: string): string {
  const config = iconConfigs[normalizeCategory(category)];
  return config?.textClass ?? "text-foreground";
}

function normalizeCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function IconShell({
  size,
  showBackground,
  bgClass,
  children,
  className,
}: {
  size: number;
  showBackground: boolean;
  bgClass: string;
  children: ReactNode;
  className?: string;
}) {
  if (!showBackground) {
    return <>{children}</>;
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md",
        bgClass,
        className
      )}
      style={{ height: size + 8, width: size + 8 }}
    >
      {children}
    </span>
  );
}

/**
 * Render a tool-category icon (lucide, or optional remote `iconUrl`).
 */
export function getToolCategoryIcon(
  category: string,
  props: ToolIconProps = {},
  iconUrl?: string | null
): ReactNode {
  const { size = 16, className, showBackground = true } = props;
  const key = normalizeCategory(category);
  const config = iconConfigs[key];

  if (!config) {
    if (iconUrl) {
      return (
        <IconShell
          bgClass="bg-muted"
          className={className}
          showBackground={showBackground}
          size={size}
        >
          <img
            alt=""
            className="object-contain"
            height={size}
            src={iconUrl}
            width={size}
          />
        </IconShell>
      );
    }
    const Fallback = WrenchIcon;
    return (
      <IconShell
        bgClass="bg-muted"
        className={className}
        showBackground={showBackground}
        size={size}
      >
        <Fallback
          className={cn("text-muted-foreground", className)}
          size={size}
        />
      </IconShell>
    );
  }

  const Icon = config.icon;
  return (
    <IconShell
      bgClass={config.bgClass}
      className={className}
      showBackground={showBackground}
      size={size}
    >
      <Icon className={cn(config.iconClass, className)} size={size} />
    </IconShell>
  );
}
