import type { UserType } from "@/lib/types";
import type { ChatModel } from "./models";

interface Entitlements {
  availableChatModelIds: ChatModel["id"][];
  maxMessagesPerDay: number;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
    maxMessagesPerDay: 20,
  },

  /*
   * For users with an account
   */
  regular: {
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
    maxMessagesPerDay: 100,
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
