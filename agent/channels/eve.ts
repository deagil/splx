import type { AuthFn } from "eve/channels/auth";
import { vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { resolveAgentPrincipal } from "../lib/auth-internal.js";

/**
 * Browser callers: a Supabase session cookie on the inbound request.
 *
 * The principal carries splx's tenancy (`workspaceId`) plus the caller's model
 * selection, so `agent/agent.ts` can resolve both on `session.started` without
 * a second round trip.
 */
function appSession(): AuthFn<Request> {
  return async (request) => {
    const principal = await resolveAgentPrincipal(request);

    if (!principal) {
      return null;
    }

    return {
      attributes: {
        ...(principal.email ? { email: principal.email } : {}),
        ...(principal.modelId ? { modelId: principal.modelId } : {}),
        workspaceId: principal.workspaceId,
      },
      authenticator: "app",
      issuer: "app",
      principalId: principal.userId,
      principalType: "user",
    };
  };
}

// Order matters: the app session is tried first, then Vercel OIDC for
// platform-to-platform calls. Without a channel file eve is fail-closed.
export default eveChannel({
  auth: [appSession(), vercelOidc()],
});
