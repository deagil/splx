/**
 * Model routing for the Eve agent.
 *
 * This module is loaded inside the Eve Nitro process, so it must stay free of
 * React, `next/*` and anything under `lib/ai/*` (which pulls in `lucide-react`
 * for the switcher's icons). It intentionally mirrors the *ids* used by
 * `lib/ai/models.ts` so the existing model switcher keeps working: the switcher
 * writes a `chat-model` cookie, the channel stamps that cookie onto the session
 * principal, and `agent/agent.ts` resolves it here on `session.started`.
 */

/** Model ids the splx switcher can produce. Mirrors `lib/ai/models.ts`. */
export const AGENT_MODEL_IDS = ["chat-model", "chat-model-reasoning"] as const;

export type AgentModelId = (typeof AGENT_MODEL_IDS)[number];

export const DEFAULT_AGENT_MODEL_ID: AgentModelId = "chat-model";

/**
 * Reasoning effort per switcher id. Eve's dynamic model resolver can only
 * return `{ model, modelOptions }` — `reasoning` is agent-level — so the effort
 * travels as an OpenAI provider option instead.
 */
type ReasoningEffort = "minimal" | "low" | "medium" | "high";

interface AgentModelSelection {
  gatewayModelId: string;
  reasoningEffort: ReasoningEffort;
}

/**
 * AI Gateway model ids. splx runs `gpt-5-mini` for both tiers today (see
 * `lib/ai/providers.ts`); the tiers differ by reasoning effort, not by model.
 */
const SELECTIONS: Record<AgentModelId, AgentModelSelection> = {
  "chat-model": {
    gatewayModelId: "openai/gpt-5.4-mini",
    reasoningEffort: "low",
  },
  "chat-model-reasoning": {
    gatewayModelId: "openai/gpt-5.4-mini",
    reasoningEffort: "high",
  },
};

export function isAgentModelId(value: unknown): value is AgentModelId {
  return (AGENT_MODEL_IDS as readonly unknown[]).includes(value);
}

export function resolveAgentModel(
  modelId: string | null | undefined
): AgentModelSelection {
  if (isAgentModelId(modelId)) {
    return SELECTIONS[modelId];
  }
  return SELECTIONS[DEFAULT_AGENT_MODEL_ID];
}

export const FALLBACK_GATEWAY_MODEL_ID =
  SELECTIONS[DEFAULT_AGENT_MODEL_ID].gatewayModelId;
