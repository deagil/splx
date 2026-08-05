import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChatSidebar } from "@/components/sidebar/chat-sidebar";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatsByUserId } from "@/lib/db/queries";
import type { User } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import type { ChatHistory } from "./sidebar-history";

export async function ChatSidebarWrapper({ user }: { user: User | undefined }) {
  if (!user) {
    redirect("/signin");
  }

  const chatId = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const initialChatModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  // Pre-fetch chat history
  let initialHistory: ChatHistory | null = null;
  try {
    initialHistory = await getChatsByUserId({
      endingBefore: null,
      id: user.id ?? "",
      limit: 20,
      startingAfter: null,
    });
  } catch {
    // If history fetch fails, use empty history
    initialHistory = { chats: [], hasMore: false };
  }

  return (
    <ChatSidebar
      chatId={chatId}
      initialChatModel={initialChatModel}
      initialHistory={initialHistory}
      initialMessages={[]}
      initialVisibilityType="private"
      isReadonly={false}
      user={user}
    />
  );
}
