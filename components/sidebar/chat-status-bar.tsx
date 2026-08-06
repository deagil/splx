"use client";

// The raw primitive, not the SelectTrigger wrapper: this call site supplies its
// own Button and does not want the wrapper's size variants or chevron icon.
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { SignatureIcon } from "lucide-react";
import { useState } from "react";
import { ContextIcon } from "@/components/elements/context";
import {
  PromptInputModelSelect,
  PromptInputModelSelectContent,
} from "@/components/elements/prompt-input";
import { PersonalizationPanel } from "@/components/sidebar/personalization-panel";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { chatModels } from "@/lib/ai/models";
import type { AppUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";

interface InfoRowProps {
  costText?: string;
  label: string;
  tokens?: number;
}

function InfoRow({ label, tokens, costText }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 font-mono">
        <span className="min-w-[4ch] text-right">
          {tokens === undefined ? "—" : tokens.toLocaleString()}
        </span>
        {costText !== undefined &&
          costText !== null &&
          !Number.isNaN(Number.parseFloat(costText)) && (
            <span className="text-muted-foreground">
              ${Number.parseFloat(costText).toFixed(6)}
            </span>
          )}
      </div>
    </div>
  );
}

function _ContextUsageButton({ usage }: { usage?: AppUsage }) {
  const used = usage?.totalTokens ?? 0;
  const max =
    usage?.context?.totalMax ??
    usage?.context?.combinedMax ??
    usage?.context?.inputMax;
  const hasMax = typeof max === "number" && Number.isFinite(max) && max > 0;
  const usedPercent = hasMax ? Math.min(100, (used / max) * 100) : 0;

  const handleCompress = () => {
    // TODO: Implement context compression
    console.log("Compress context - coming soon");
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          className="h-8 p-1 text-muted-foreground text-xs hover:text-foreground md:h-fit md:p-2"
          type="button"
          variant="ghost"
        >
          <div className="size-3.5 [&>svg]:size-3.5">
            <ContextIcon percent={usedPercent} />
          </div>
          <span className="ml-1 hidden text-[10px] sm:inline">
            {usedPercent.toFixed(0)}%
          </span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-64 p-3" side="top">
        <div className="space-y-2">
          <div className="flex items-start justify-between text-sm">
            <span>{usedPercent.toFixed(1)}%</span>
            <span className="text-muted-foreground">
              {hasMax ? `${used} / ${max} tokens` : `${used} tokens`}
            </span>
          </div>
          <div className="space-y-2">
            <Progress className="h-2 bg-muted" value={usedPercent} />
          </div>
          <div className="mt-1 space-y-1">
            {usage?.inputTokenDetails?.cacheReadTokens &&
              usage.inputTokenDetails.cacheReadTokens > 0 && (
                <InfoRow
                  costText={usage?.costUSD?.cacheReadUSD?.toString()}
                  label="Cache Hits"
                  tokens={usage?.inputTokenDetails?.cacheReadTokens}
                />
              )}
            <InfoRow
              costText={usage?.costUSD?.inputUSD?.toString()}
              label="Input"
              tokens={usage?.inputTokens}
            />
            <InfoRow
              costText={usage?.costUSD?.outputUSD?.toString()}
              label="Output"
              tokens={usage?.outputTokens}
            />
            <InfoRow
              costText={usage?.costUSD?.reasoningUSD?.toString()}
              label="Reasoning"
              tokens={
                usage?.outputTokenDetails?.reasoningTokens &&
                usage.outputTokenDetails.reasoningTokens > 0
                  ? usage.outputTokenDetails.reasoningTokens
                  : undefined
              }
            />
            {usage?.costUSD?.totalUSD !== undefined && (
              <>
                <Separator className="mt-1" />
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">Total cost</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="min-w-[4ch] text-right" />
                    <span>
                      {Number.isNaN(
                        Number.parseFloat(usage.costUSD.totalUSD.toString())
                      )
                        ? "—"
                        : `$${Number.parseFloat(usage.costUSD.totalUSD.toString()).toFixed(6)}`}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <Separator className="mt-2" />
          <Button
            className="h-7 w-full text-xs"
            disabled
            onClick={handleCompress}
            size="sm"
            variant="outline"
          >
            Compress Context
            <span className="ml-1 text-[10px] text-muted-foreground">
              (Coming Soon)
            </span>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function ModelSelectorButton({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const selectedModel = chatModels.find(
    (model) => model.id === selectedModelId
  );
  const IconComponent = selectedModel?.icon;

  return (
    <PromptInputModelSelect
      onValueChange={(modelName) => {
        const model = chatModels.find((m) => m.name === modelName);
        if (model) {
          onModelChange?.(model.id);
          // Set cookie client-side to avoid triggering page refresh
          document.cookie = `chat-model=${model.id}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
        }
      }}
      value={selectedModel?.name}
    >
      <SelectPrimitive.Trigger
        render={
          <Button
            className={cn(
              "h-8 p-1 text-muted-foreground text-sm hover:text-foreground md:h-fit md:p-2",
              "rounded-md transition-colors",
              selectedModelId === "chat-model"
                ? "bg-muted hover:bg-muted"
                : "bg-blue-200 hover:bg-blue-300 dark:bg-slate-700/60 dark:hover:bg-slate-700/90"
            )}
            type="button"
            variant="ghost"
          >
            {!!IconComponent && <IconComponent className="mr-0.5" size={12} />}
            <span className="hidden text-[10px] sm:inline">
              {selectedModel?.name}
            </span>
          </Button>
        }
      />
      <PromptInputModelSelectContent className="min-w-[280px] p-1">
        <div className="mb-1 px-2 py-1 font-medium text-[10px] text-muted-foreground">
          What are you working on?
        </div>
        <div className="flex flex-col gap-0.5">
          {chatModels.map((model) => {
            const ModelIcon = model.icon;
            return (
              <SelectItem
                className="cursor-pointer"
                key={model.id}
                value={model.name}
              >
                <div className="flex items-start gap-2 py-0.5">
                  <ModelIcon className="mt-0.5 shrink-0" size={14} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs">{model.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        • {model.description}
                      </span>
                    </div>
                    {/* <div className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                      {model.useCases}
                    </div> */}
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </div>
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}

function PersonalizationButton() {
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("personalization-enabled") === "true";
    }
    return false;
  });
  const [showPanel, setShowPanel] = useState(false);
  const [preferences, setPreferences] = useState({
    ai_context: null as string | null,
    ai_guidance: null as string | null,
    ai_tone: null as string | null,
    proficiency: null as string | null,
  });
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);

  const handleOpenPanel = async () => {
    if (!hasLoadedPreferences) {
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
          setHasLoadedPreferences(true);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    }
    setShowPanel(true);
  };

  const handlePersonalizationToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem("personalization-enabled", enabled.toString());
    window.dispatchEvent(new Event("personalization-changed"));
  };

  return (
    <>
      <Button
        className="h-8 p-1 text-muted-foreground text-xs hover:text-foreground md:h-fit md:p-2"
        onClick={handleOpenPanel}
        type="button"
        variant="ghost"
      >
        <SignatureIcon className="mr-0.5" size={12} />
        <span className="hidden text-[10px] sm:inline">Personalise</span>
      </Button>

      <PersonalizationPanel
        onOpenChange={setShowPanel}
        onPersonalizationToggle={handlePersonalizationToggle}
        open={showPanel}
        personalizationEnabled={isEnabled}
        {...preferences}
      />
    </>
  );
}

import { ChatHelpDialog } from "@/components/chat/chat-help-dialog";

export function ChatStatusBar({
  usage,
  selectedModelId,
  onModelChange,
}: {
  usage?: AppUsage;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 pb-2 text-xs">
      <div className="flex items-center gap-2">
        {/* TODO: Show context length meter when usage > 50% */}
        {/* <ContextUsageButton usage={usage} /> */}
        <ModelSelectorButton
          onModelChange={onModelChange}
          selectedModelId={selectedModelId}
        />
        <PersonalizationButton />
      </div>
      <div className="flex items-center">
        <ChatHelpDialog />
      </div>
    </div>
  );
}
