let pendingMessage: { chatId: string; text: string } | null = null;

export function setPendingMessage(chatId: string, text: string) {
  pendingMessage = { chatId, text };
}

export function consumePendingMessage(chatId: string): string | null {
  if (pendingMessage?.chatId !== chatId) {
    return null;
  }
  const text = pendingMessage.text;
  pendingMessage = null;
  return text;
}

export function clearPendingMessage() {
  pendingMessage = null;
}
