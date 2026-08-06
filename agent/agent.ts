import { defineAgent, defineDynamic } from "eve";
import { FALLBACK_GATEWAY_MODEL_ID, resolveAgentModel } from "./lib/models.js";

/**
 * The splx sidebar agent.
 *
 * Model routing is server-side on this path: the model switcher writes a
 * `chat-model` cookie, `agent/channels/eve.ts` stamps it onto the session
 * principal, and the resolver below turns it into a Gateway model id plus a
 * reasoning effort. That is why the switcher no longer passes a model through
 * `useChat` — see docs/EVE_AGENT_PORT.md §7.2.
 *
 * `agent/tools/` is intentionally empty for now. The built-in harness still
 * supplies `web_search`, `todo`, `ask_question` and the subagent tool, so the
 * agent is usable before any splx tool is wired.
 */
export default defineAgent({
  model: defineDynamic({
    events: {
      "session.started": (_event, ctx) => {
        const attributes = ctx.session.auth.current?.attributes;
        const modelId = attributes?.modelId;
        const selection = resolveAgentModel(
          typeof modelId === "string" ? modelId : null
        );

        return {
          model: selection.gatewayModelId,
          modelOptions: {
            providerOptions: {
              openai: { reasoningEffort: selection.reasoningEffort },
            },
          },
        };
      },
    },
    fallback: FALLBACK_GATEWAY_MODEL_ID,
  }),
});
