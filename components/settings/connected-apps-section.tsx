"use client";

import { useState } from "react";
import useSWR from "swr";
import { Database, Sparkles, Search } from "lucide-react";

import type { AppMode } from "@/lib/app-mode";
import type {
  Integration,
  IntegrationCategory,
  IntegrationStatus,
} from "@/lib/integrations/registry";
import {
  integrations,
  categoryLabels,
  filterIntegrations,
} from "@/lib/integrations/registry";
import { IntegrationListItem } from "@/components/settings/integration-list-item";
import { IntegrationConfigModal } from "@/components/settings/integration-config-modal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ConnectedApp = {
  id?: string;
  type: "postgres" | "openai";
  configured: boolean;
  source: "database" | "env";
  updatedAt?: string;
  metadata?: Record<string, unknown>;
};

type ApiResponse = {
  app: ConnectedApp;
};

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
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
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
        if (postgresLoading) return "loading";
        return postgresApp?.configured ? "connected" : "not-connected";
      case "openai":
        if (openAiLoading) return "loading";
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
        return undefined;
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
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              activeCategory === category
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
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
              key={integration.id}
              integration={integration}
              status={getStatus(integration.id)}
              icon={getIntegrationIcon(integration.id)}
              onConfigure={() => handleConfigure(integration)}
            />
          ))
        )}
      </div>

      {/* Configuration Modal */}
      <IntegrationConfigModal
        integration={selectedIntegration}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={mode}
        metadata={selectedIntegration ? getMetadata(selectedIntegration.id) : undefined}
        onSuccess={handleModalSuccess}
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
