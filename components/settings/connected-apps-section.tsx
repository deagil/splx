"use client";

import { Database, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { IntegrationConfigModal } from "@/components/settings/integration-config-modal";
import { IntegrationListItem } from "@/components/settings/integration-list-item";
import { Input } from "@/components/ui/input";
import type { AppMode } from "@/lib/app-mode";
import type {
  Integration,
  IntegrationCategory,
  IntegrationStatus,
} from "@/lib/integrations/registry";
import {
  categoryLabels,
  filterIntegrations,
} from "@/lib/integrations/registry";
import { cn } from "@/lib/utils";

interface ConnectedApp {
  configured: boolean;
  id?: string;
  metadata?: Record<string, unknown>;
  source: "database" | "env";
  type: "postgres" | "openai";
  updatedAt?: string;
}

interface ApiResponse {
  app: ConnectedApp;
}

const fetcher = async (url: string): Promise<ConnectedApp> => {
  const response = await fetch(url, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    let message = "Unable to load app status";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // ignore json parsing errors
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as ApiResponse;
  return payload.app;
};

const categories: IntegrationCategory[] = ["all", "databases", "ai-providers"];

export function ConnectedAppsSettings({ mode }: { mode: AppMode }) {
  const [activeCategory, setActiveCategory] =
    useState<IntegrationCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch status for each integration
  const {
    data: postgresApp,
    isLoading: postgresLoading,
    mutate: refreshPostgres,
  } = useSWR<ConnectedApp>("/api/workspace-apps/postgres", fetcher);

  const {
    data: openAiApp,
    isLoading: openAiLoading,
    mutate: refreshOpenAi,
  } = useSWR<ConnectedApp>("/api/workspace-apps/openai", fetcher);

  // Filter integrations based on category and search
  const filteredIntegrations = filterIntegrations(activeCategory).filter(
    (integration) =>
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get status for an integration
  const getStatus = (id: string): IntegrationStatus => {
    switch (id) {
      case "postgres":
        if (postgresLoading) {
          return "loading";
        }
        return postgresApp?.configured ? "connected" : "not-connected";
      case "openai":
        if (openAiLoading) {
          return "loading";
        }
        return openAiApp?.configured ? "connected" : "not-connected";
      default:
        return "not-connected";
    }
  };

  // Get metadata for an integration
  const getMetadata = (id: string): Record<string, unknown> | undefined => {
    switch (id) {
      case "postgres":
        return postgresApp?.metadata;
      case "openai":
        return openAiApp?.metadata;
      default:
        return;
    }
  };

  // Handle configuration modal
  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    // Refresh the relevant integration data
    if (selectedIntegration?.id === "postgres") {
      refreshPostgres();
    } else if (selectedIntegration?.id === "openai") {
      refreshOpenAi();
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Category Tabs */}
      <div className="flex w-fit flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
        {categories.map((category) => (
          <button
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-sm transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              activeCategory === category
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search integrations..."
          value={searchQuery}
        />
      </div>

      {/* Integration List */}
      <div className="space-y-3">
        {filteredIntegrations.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No integrations match your search."
                : "No integrations available in this category."}
            </p>
          </div>
        ) : (
          filteredIntegrations.map((integration) => (
            <IntegrationListItem
              icon={getIntegrationIcon(integration.id)}
              integration={integration}
              key={integration.id}
              onConfigure={() => handleConfigure(integration)}
              status={getStatus(integration.id)}
            />
          ))
        )}
      </div>

      {/* Configuration Modal */}
      <IntegrationConfigModal
        integration={selectedIntegration}
        metadata={
          selectedIntegration ? getMetadata(selectedIntegration.id) : undefined
        }
        mode={mode}
        onOpenChange={setModalOpen}
        onSuccess={handleModalSuccess}
        open={modalOpen}
      />
    </div>
  );
}

function getIntegrationIcon(id: string) {
  switch (id) {
    case "postgres":
      return <Database className="size-6" />;
    case "openai":
      return <Sparkles className="size-6" />;
    default:
      return null;
  }
}
