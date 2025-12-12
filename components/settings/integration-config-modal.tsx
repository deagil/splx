"use client";

import type { ReactNode } from "react";
import { Database, Sparkles } from "lucide-react";

import type { AppMode } from "@/lib/app-mode";
import type { Integration } from "@/lib/integrations/registry";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PostgresConfigForm } from "@/components/settings/integration-forms/postgres-config-form";
import { OpenAIConfigForm } from "@/components/settings/integration-forms/openai-config-form";
import { cn } from "@/lib/utils";

type IntegrationConfigModalProps = {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AppMode;
  metadata?: Record<string, unknown>;
  onSuccess?: () => void;
};

export function IntegrationConfigModal({
  integration,
  open,
  onOpenChange,
  mode,
  metadata,
  onSuccess,
}: IntegrationConfigModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (!integration) {
    return null;
  }

  const icon = getIntegrationIcon(integration.id);
  const title = `Configure ${integration.name}`;
  const description = integration.description;

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                  integration.brandConfig.iconClassName
                )}
              >
                {icon}
              </div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ConfigFormContent
            integrationId={integration.id}
            mode={mode}
            metadata={metadata}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                integration.brandConfig.iconClassName
              )}
            >
              {icon}
            </div>
            <div>
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription className="mt-1">
                {description}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <ConfigFormContent
            integrationId={integration.id}
            mode={mode}
            metadata={metadata}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

type ConfigFormContentProps = {
  integrationId: string;
  mode: AppMode;
  metadata?: Record<string, unknown>;
  onSuccess: () => void;
  onCancel: () => void;
};

function ConfigFormContent({
  integrationId,
  mode,
  metadata,
  onSuccess,
  onCancel,
}: ConfigFormContentProps) {
  switch (integrationId) {
    case "postgres":
      return (
        <PostgresConfigForm
          mode={mode}
          metadata={metadata}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );
    case "openai":
      return (
        <OpenAIConfigForm
          metadata={metadata}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );
    default:
      return (
        <div className="py-8 text-center text-muted-foreground">
          Configuration not available for this integration.
        </div>
      );
  }
}

function getIntegrationIcon(id: string): ReactNode {
  switch (id) {
    case "postgres":
      return <Database className="size-5" />;
    case "openai":
      return <Sparkles className="size-5" />;
    default:
      return null;
  }
}











