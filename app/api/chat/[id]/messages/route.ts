import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";
import { ChatSDKError } from "@/lib/errors";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return Response.json({ messages: [] });
  }

  if (chat.visibility === "private" && chat.user_id !== authUser.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const messagesFromDb = await getMessagesByChatId({ id });
  const uiMessages = convertToUIMessages(messagesFromDb);

  return Response.json({ messages: uiMessages });
}

