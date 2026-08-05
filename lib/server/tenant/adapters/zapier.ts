import type {
  AdapterContext,
  ResourceAdapter,
  ResourceAdapterKind,
} from "./base";

export interface ZapierInvocationOptions {
  event?: string;
  headers?: Record<string, string>;
  method?: "POST" | "PUT" | "PATCH";
  payload?: Record<string, unknown>;
  url?: string;
}

export class ZapierResourceAdapter implements ResourceAdapter {
  readonly kind: ResourceAdapterKind = "zapier";

  constructor(private readonly context: AdapterContext) {}

  get workspaceId(): string {
    return this.context.workspaceId;
  }

  async initialize(): Promise<void> {
    // No initialization required for Zapier REST integration
  }

  async dispose(): Promise<void> {
    // Nothing to dispose
  }

  async invoke(options: ZapierInvocationOptions) {
    const targetUrl = options.url ?? this.resolveBaseUrl();
    if (!targetUrl) {
      throw new Error("Zapier webhook URL is not configured");
    }

    const apiKey = this.resolveApiKey();

    const response = await fetch(targetUrl, {
      body: JSON.stringify({
        event: options.event ?? "zapier.webhook",
        payload: options.payload ?? {},
      }),
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        ...options.headers,
      },
      method: options.method ?? "POST",
    });

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        `Zapier invocation failed with status ${response.status}: ${text}`
      );
    }

    return response.json().catch(() => undefined);
  }

  private resolveBaseUrl(): string | undefined {
    const metadata = this.context.configuration ?? {};
    return (
      (metadata.webhookUrl as string | undefined) ??
      (metadata.url as string | undefined) ??
      (metadata.endpoint as string | undefined)
    );
  }

  private resolveApiKey(): string | undefined {
    const metadata = this.context.configuration ?? {};
    const { credentialRef } = this.context;

    const metadataKey =
      (metadata.apiKey as string | undefined) ??
      (metadata.token as string | undefined);

    if (metadataKey) {
      return metadataKey;
    }

    if (credentialRef?.startsWith("env:")) {
      const envVar = credentialRef.slice(4);
      return process.env[envVar];
    }

    return credentialRef ?? undefined;
  }
}
