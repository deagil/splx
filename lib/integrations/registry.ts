import type { ReactNode } from "react";

export type IntegrationCategory = "all" | "databases" | "ai-providers";

export type IntegrationStatus = "connected" | "not-connected" | "loading" | "error";

export type Integration = {
  /** Unique identifier for the integration */
  id: string;
  /** Display name */
  name: string;
  /** Short description of what the integration does */
  description: string;
  /** Category for filtering */
  category: Exclude<IntegrationCategory, "all">;
  /** API endpoint for fetching/saving configuration */
  apiEndpoint: string;
  /** Whether this integration can be configured (vs coming soon) */
  configurable: boolean;
  /** Optional URL to learn more about the integration */
  learnMoreUrl?: string;
  /** Brand configuration for styling */
  brandConfig: IntegrationBrandConfig;
};

export type IntegrationBrandConfig = {
  /** Primary brand color in hex format */
  primary: string;
  /** Optional secondary brand color */
  secondary?: string;
  /** Tailwind classes for the icon container */
  iconClassName: string;
  /** Tailwind classes for the connected status badge */
  connectedClassName: string;
  /** Tailwind classes for the connect button */
  connectButtonClassName: string;
};

/**
 * Registry of all available integrations
 */
export const integrations: Integration[] = [
  {
    id: "postgres",
    name: "Postgres",
    description: "Configure the primary database connection used for loading workspace data.",
    category: "databases",
    apiEndpoint: "/api/workspace-apps/postgres",
    configurable: true,
    learnMoreUrl: "https://www.postgresql.org/docs/",
    brandConfig: {
      primary: "#336791",
      iconClassName: "bg-gradient-to-br from-blue-50 to-white border-blue-200 text-blue-700 dark:from-blue-950/50 dark:to-blue-900/30 dark:border-blue-800 dark:text-blue-300",
      connectedClassName: "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500",
      connectButtonClassName: "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600",
    },
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Authenticate OpenAI so Splx can call models on your behalf.",
    category: "ai-providers",
    apiEndpoint: "/api/workspace-apps/openai",
    configurable: true,
    learnMoreUrl: "https://platform.openai.com/docs/",
    brandConfig: {
      primary: "#10A37F",
      secondary: "#6366F1",
      iconClassName: "bg-gradient-to-br from-emerald-50 to-white border-emerald-200 text-emerald-700 dark:from-emerald-950/50 dark:to-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300",
      connectedClassName: "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500",
      connectButtonClassName: "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600",
    },
  },
];

/**
 * Category labels for the filter tabs
 */
export const categoryLabels: Record<IntegrationCategory, string> = {
  all: "All integrations",
  databases: "Databases",
  "ai-providers": "AI Providers",
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
export function filterIntegrations(category: IntegrationCategory): Integration[] {
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
  { id: "postgres", color: "#336791" },
  { id: "openai", color: "#10A37F" },
  { id: "mysql", color: "#4479A1" },
  { id: "mongodb", color: "#47A248" },
  { id: "slack", color: "#4A154B" },
  { id: "github", color: "#181717" },
  { id: "linear", color: "#5E6AD2" },
  { id: "figma", color: "#F24E1E" },
  { id: "notion", color: "#000000" },
  { id: "google", color: "#4285F4" },
  { id: "anthropic", color: "#D4A574" },
  { id: "stripe", color: "#635BFF" },
] as const;





