export interface SendEmailParams {
  from: string;
  html: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string;
}

export interface SendEmailResult {
  messageId: string;
}

export interface EmailProvider {
  send: (params: SendEmailParams) => Promise<SendEmailResult>;
}

/**
 * Resend-backed provider. Uses platform RESEND_API_KEY.
 * In development without a key, logs and returns a fake message id.
 */
export function createResendProvider(): EmailProvider {
  return {
    async send(params) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("RESEND_API_KEY is not configured");
        }
        console.info("[comms] RESEND_API_KEY missing — skipping send", {
          subject: params.subject,
          to: params.to,
        });
        return { messageId: `dev-${Date.now()}` };
      }

      const response = await fetch("https://api.resend.com/emails", {
        body: JSON.stringify({
          from: params.from,
          html: params.html,
          reply_to: params.replyTo,
          subject: params.subject,
          text: params.text,
          to: [params.to],
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const body = (await response.json()) as {
        id?: string;
        message?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(
          body.error?.message ??
            body.message ??
            `Resend HTTP ${response.status}`
        );
      }

      if (!body.id) {
        throw new Error("Resend response missing message id");
      }

      return { messageId: body.id };
    },
  };
}

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!cachedProvider) {
    cachedProvider = createResendProvider();
  }
  return cachedProvider;
}

/** Test seam */
export function setEmailProviderForTests(provider: EmailProvider | null): void {
  cachedProvider = provider;
}
