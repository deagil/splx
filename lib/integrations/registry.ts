export type IntegrationCategory = "all" | "databases" | "ai-providers";

export type IntegrationStatus =
  | "connected"
  | "not-connected"
  | "loading"
  | "error";

export interface Integration {
  /** API endpoint for fetching/saving configuration */
  apiEndpoint: string;
  /** Brand configuration for styling */
  brandConfig: IntegrationBrandConfig;
  /** Category for filtering */
  category: Exclude<IntegrationCategory, "all">;
  /** Whether this integration can be configured (vs coming soon) */
  configurable: boolean;
  /** Short description of what the integration does */
  description: string;
  /** Unique identifier for the integration */
  id: string;
  /** Optional URL to learn more about the integration */
  learnMoreUrl?: string;
  /** Display name */
  name: string;
}

export interface IntegrationBrandConfig {
  /** Tailwind classes for the connect button */
  connectButtonClassName: string;
  /** Tailwind classes for the connected status badge */
  connectedClassName: string;
  /** Tailwind classes for the icon container */
  iconClassName: string;
  /** Primary brand color in hex format */
  primary: string;
  /** Optional secondary brand color */
  secondary?: string;
}

/**
 * Registry of all available integrations
 */
export const integrations: Integration[] = [
  {
    apiEndpoint: "/api/workspace-apps/postgres",
    brandConfig: {
      connectButtonClassName:
        "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600",
      connectedClassName:
        "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500",
      iconClassName:
        "bg-gradient-to-br from-blue-50 to-white border-blue-200 text-blue-700 dark:from-blue-950/50 dark:to-blue-900/30 dark:border-blue-800 dark:text-blue-300",
      primary: "#336791",
    },
    category: "databases",
    configurable: true,
    description:
      "Configure the primary database connection used for loading workspace data.",
    id: "postgres",
    learnMoreUrl: "https://www.postgresql.org/docs/",
    name: "Postgres",
  },
  {
    apiEndpoint: "/api/workspace-apps/openai",
    brandConfig: {
      connectButtonClassName:
        "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600",
      connectedClassName:
        "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500",
      iconClassName:
        "bg-gradient-to-br from-emerald-50 to-white border-emerald-200 text-emerald-700 dark:from-emerald-950/50 dark:to-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300",
      primary: "#10A37F",
      secondary: "#6366F1",
    },
    category: "ai-providers",
    configurable: true,
    description: "Authenticate OpenAI so Splx can call models on your behalf.",
    id: "openai",
    learnMoreUrl: "https://platform.openai.com/docs/",
    name: "OpenAI",
  },
];

/**
 * Category labels for the filter tabs
 */
export const categoryLabels: Record<IntegrationCategory, string> = {
  "ai-providers": "AI Providers",
  all: "All integrations",
  databases: "Databases",
};

/**
 * Get an integration by its ID
 */
export function getIntegration(id: string): Integration | undefined {
  return integrations.find((i) => i.id === id);
}

/**
 * Filter integrations by category
 */
export function filterIntegrations(
  category: IntegrationCategory
): Integration[] {
  if (category === "all") {
    return integrations;
  }
  return integrations.filter((i) => i.category === category);
}

/**
 * Icons for the decorative header mosaic
 * These represent various integration types (real and aspirational)
 */
export const mosaicIcons = [
  { color: "#336791", id: "postgres" },
  { color: "#10A37F", id: "openai" },
  { color: "#4479A1", id: "mysql" },
  { color: "#47A248", id: "mongodb" },
  { color: "#4A154B", id: "slack" },
  { color: "#181717", id: "github" },
  { color: "#5E6AD2", id: "linear" },
  { color: "#F24E1E", id: "figma" },
  { color: "#000000", id: "notion" },
  { color: "#4285F4", id: "google" },
  { color: "#D4A574", id: "anthropic" },
  { color: "#635BFF", id: "stripe" },
] as const;
