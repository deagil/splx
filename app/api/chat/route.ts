import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import postgres from "postgres";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { VisibilityType } from "@/components/shared/visibility-selector";
import { createChatAgent } from "@/lib/ai/agents/chat-agent";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { getReasoningOpenAIOptions } from "@/lib/ai/openai-config";
import {
  type RequestHints,
  systemPrompt,
  type UserPreferences,
} from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { navigateToPage } from "@/lib/ai/tools/navigate-to-page";
import { queryUserTable } from "@/lib/ai/tools/query-user-table";
import { readUrlContent } from "@/lib/ai/tools/read-url-content";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchPages } from "@/lib/ai/tools/search-pages";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { generateTitleFromUserMessage } from "@/lib/chat/actions";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
  updateChatTitleById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { role, user, workspace, workspaceUser } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { createEnrichedMessageContent } from "@/lib/server/mentions/enrich";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { ChatMessage, UserType } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

// Helper for timestamped logging
function logWithTimestamp(label: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const elapsed =
    typeof performance === "undefined"
      ? ""
      : `+${performance.now().toFixed(0)}ms`;
  if (data) {
    console.log(`[Chat API] ${timestamp} ${elapsed} | ${label}`, data);
  } else {
    console.log(`[Chat API] ${timestamp} ${elapsed} | ${label}`);
  }
}

// Enrichment status type for streaming progress to UI
export interface EnrichmentStatus {
  label: string;
  progress?: number; // 0-100
  step:
    | "reading-url"
    | "processing-mentions"
    | "personalizing"
    | "preparing"
    | "starting";
}

/**
 * Cached user preferences fetcher
 * Caches for 5 minutes per user+workspace combination
 */
const getCachedUserPreferences = cache(
  async (userId: string, workspaceId: string) => {
    const sql = postgres(process.env.POSTGRES_URL!);
    const db = drizzle(sql);

    try {
      // Fetch user data with profile fields
      const [userData] = await db
        .select({
          ai_context: user.ai_context,
          ai_guidance: user.ai_guidance,
          ai_tone: user.ai_tone,
          firstname: user.firstname,
          job_title: user.job_title,
          lastname: user.lastname,
          proficiency: user.proficiency,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      // Get workspace details
      const [workspaceData] = await db
        .select({
          description: workspace.description,
          name: workspace.name,
        })
        .from(workspace)
        .where(eq(workspace.id, workspaceId))
        .limit(1);

      // Get user's role in this workspace
      let roleLabel: string | undefined;
      const [workspaceUserData] = await db
        .select({
          role_id: workspaceUser.role_id,
        })
        .from(workspaceUser)
        .where(
          and(
            eq(workspaceUser.user_id, userId),
            eq(workspaceUser.workspace_id, workspaceId)
          )
        )
        .limit(1);

      if (workspaceUserData?.role_id) {
        const [roleData] = await db
          .select({
            label: role.label,
          })
          .from(role)
          .where(
            and(
              eq(role.id, workspaceUserData.role_id),
              eq(role.workspace_id, workspaceId)
            )
          )
          .limit(1);

        if (roleData) {
          roleLabel = roleData.label;
        }
      }

      return {
        roleLabel,
        userData,
        workspaceData,
      };
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
  ["user-preferences"],
  { revalidate: 300 } // Cache for 5 minutes
);

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  const requestStartTime = Date.now();
  logWithTimestamp("📥 Request received");

  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
    logWithTimestamp("✓ Request body parsed", {
      chatId: (json as { id?: string }).id,
      hasMentions: Boolean(
        (json as { message?: { mentions?: unknown[] } }).message?.mentions
          ?.length
      ),
      model: (json as { selectedChatModel?: string }).selectedChatModel,
    });
  } catch {
    logWithTimestamp("✗ Request body parse failed");
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      personalizationEnabled,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
      personalizationEnabled?: boolean;
    } = requestBody;

    const authStartTime = Date.now();
    const authUser = await getAuthenticatedUser();
    logWithTimestamp("✓ Auth completed", {
      duration: `${Date.now() - authStartTime}ms`,
      userId: authUser?.id?.slice(0, 8),
    });

    if (!authUser) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userId = authUser.id;

    // Extract skill from message (from slash commands)
    const { skill } = message as any;

    // Resolve tenant context early (needed for preferences caching and chat)
    const tenant = await resolveTenantContext();
    const currentWorkspaceId = tenant.workspaceId;

    // Fetch user preferences and context for personalization (CACHED - 5 min TTL)
    let userPreferences: UserPreferences | undefined;

    // Always fetch if we have a skill, or if personalization is enabled
    if (personalizationEnabled || skill) {
      const prefsStartTime = Date.now();
      try {
        // Use cached preferences (cache key: userId + workspaceId)
        const cachedPrefs = await getCachedUserPreferences(
          userId,
          currentWorkspaceId
        );

        userPreferences = {
          // AI preferences
          aiContext: cachedPrefs.userData?.ai_context,
          aiGuidance: cachedPrefs.userData?.ai_guidance,
          aiTone: cachedPrefs.userData?.ai_tone,
          // User profile
          firstName: cachedPrefs.userData?.firstname,
          jobTitle: cachedPrefs.userData?.job_title,
          lastName: cachedPrefs.userData?.lastname,
          personalizationEnabled: personalizationEnabled ?? false,
          proficiency: cachedPrefs.userData?.proficiency,
          // Role context
          roleLabel: cachedPrefs.roleLabel,
          skillName: skill?.name,
          // Skill context (from slash commands)
          skillPrompt: skill?.prompt,
          workspaceDescription: cachedPrefs.workspaceData?.description,
          // Workspace context
          workspaceName: cachedPrefs.workspaceData?.name,
        };
        logWithTimestamp("✓ User preferences fetched (cached)", {
          duration: `${Date.now() - prefsStartTime}ms`,
          hasSkill: Boolean(skill),
          personalizationEnabled,
        });
      } catch (error) {
        logWithTimestamp("✗ User preferences fetch failed", {
          error: String(error),
        });
        console.error("Error fetching user preferences:", error);
        // If we have a skill but failed to fetch preferences, still include the skill
        if (skill) {
          userPreferences = {
            personalizationEnabled: false,
            skillName: skill.name,
            skillPrompt: skill.prompt,
          };
        }
      }
    }

    // Authenticated users via Supabase are "regular" users
    const userType: UserType = "regular";

    const messageCount = await getMessageCountByUserId({
      differenceInHours: 24,
      id: userId,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chatLookupStartTime = Date.now();
    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let workspaceId: string;

    if (chat) {
      if (chat.user_id !== userId) {
        logWithTimestamp("✗ Chat access forbidden", { chatId: id });
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      workspaceId = chat.workspace_id;
      // Only fetch messages if chat already exists
      messagesFromDb = await getMessagesByChatId({ id });
      logWithTimestamp("✓ Existing chat loaded", {
        duration: `${Date.now() - chatLookupStartTime}ms`,
        messageCount: messagesFromDb.length,
      });
    } else {
      // Use already-resolved tenant context for new chat
      workspaceId = currentWorkspaceId;

      // Create chat with placeholder title immediately
      const placeholderTitle = "New Chat";

      await saveChat({
        id,
        title: placeholderTitle,
        userId,
        visibility: selectedVisibilityType,
      });
      logWithTimestamp("✓ New chat created", {
        chatId: id,
        duration: `${Date.now() - chatLookupStartTime}ms`,
        title: placeholderTitle,
      });

      // Generate actual title asynchronously in the background
      after(async () => {
        try {
          const generatedTitle = await generateTitleFromUserMessage({
            message,
          });
          await updateChatTitleById({ chatId: id, title: generatedTitle });
          console.log(
            `[Chat API] Background title generated for chat ${id}: ${generatedTitle?.slice(
              0,
              30
            )}`
          );
        } catch (error) {
          console.error(
            `[Chat API] Failed to generate title for chat ${id}:`,
            error
          );
          // Non-critical error - chat already exists with placeholder title
        }
      });

      // New chat - no need to fetch messages, it's empty
    }

    // Enrich the user message with mention data if present
    // Mentions are converted to text and included with the user's message before sending to AI
    // Ensure mentions are passed from request body to the message object
    const messageWithMentions = {
      ...message,
      mentions: requestBody.message.mentions,
    };

    const mentionCount = messageWithMentions.mentions?.length ?? 0;
    if (mentionCount > 0) {
      logWithTimestamp("📎 Mentions detected", {
        count: mentionCount,
        types: messageWithMentions.mentions?.map(
          (m: { type: string }) => m.type
        ),
      });
    }

    // Create enriched message for AI (with mention data as text)
    const enrichmentStartTime = Date.now();
    let enrichedMessageForAI = messageWithMentions;
    const enrichedText =
      await createEnrichedMessageContent(messageWithMentions);

    if (enrichedText?.trim()) {
      logWithTimestamp("✓ Message enriched with mention data", {
        duration: `${Date.now() - enrichmentStartTime}ms`,
        enrichedTextLength: enrichedText.length,
      });
    }

    // If we have enriched text (mentions converted to text), create version for AI
    if (enrichedText?.trim() && message.parts) {
      // Replace all text parts with the enriched text (which includes mention context + user message)
      const nonTextParts = message.parts.filter((part) => part.type !== "text");
      enrichedMessageForAI = {
        ...messageWithMentions,
        parts: [{ text: enrichedText, type: "text" }, ...nonTextParts],
      };
    }

    // For UI display, use original message with mentions (not enriched text)
    // For AI, use enriched message
    const uiMessages = [
      ...convertToUIMessages(messagesFromDb),
      messageWithMentions,
    ];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      city,
      country,
      latitude,
      longitude,
    };

    // Save the original message to database (preserve original text and mentions separately)
    // This allows us to display mentions as chips in the UI while sending enriched text to AI
    const saveUserMsgStartTime = Date.now();
    await saveMessages({
      messages: [
        {
          attachments: [],
          chat_id: id,
          created_at: new Date(),
          id: message.id,
          mentions: messageWithMentions.mentions || null, // Store mentions separately
          parts: message.parts, // Use original parts (not enriched) for display
          role: "user",
          workspace_id: workspaceId,
        },
      ],
    });
    logWithTimestamp("✓ User message saved to DB", {
      duration: `${Date.now() - saveUserMsgStartTime}ms`,
      messageId: message.id,
    });

    const streamId = generateUUID();
    await createStreamId({ chatId: id, streamId });

    let finalMergedUsage: AppUsage | undefined;
    let streamStartTime: number;
    let _firstChunkTime: number | undefined;

    logWithTimestamp("🚀 Starting AI stream", {
      model: selectedChatModel,
      totalSetupTime: `${Date.now() - requestStartTime}ms`,
    });
    streamStartTime = Date.now();

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // Create agent with runtime dependencies (dataStream, session)
        // This ensures tools are configured consistently
        const _agent = createChatAgent({
          dataStream,
          requestHints,
          selectedChatModel,
          session: { user: { id: userId } } as any,
          userPreferences,
        });

        // Extract tools from agent configuration for use with streamText
        // Note: We still use streamText directly to maintain compatibility
        // with experimental_transform, experimental_telemetry, and experimental_activeTools
        // The agent abstraction provides consistency and type safety
        const session = { user: { id: userId } } as any;
        const tools = {
          createDocument: createDocument({ dataStream, session }),
          getWeather,
          navigateToPage: navigateToPage({ dataStream }),
          queryUserTable,
          readUrlContent,
          requestSuggestions: requestSuggestions({ dataStream, session }),
          searchPages,
          updateDocument: updateDocument({ dataStream, session }),
        };

        const result = streamText({
          activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                  "readUrlContent",
                  "queryUserTable",
                  "searchPages",
                  "navigateToPage",
                ],
          experimental_telemetry: {
            functionId: "stream-text",
            isEnabled: isProductionEnvironment,
          },
          experimental_transform: smoothStream({
            chunking: "word",
            delayInMs: 20,
          }),
          messages: await convertToModelMessages(
            // Replace the last message (user message) with enriched version for AI
            uiMessages.slice(0, -1).concat([enrichedMessageForAI])
          ),
          model: myProvider.languageModel(selectedChatModel),
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const { modelId } = myProvider.languageModel(selectedChatModel);
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  data: finalMergedUsage,
                  type: "data-usage",
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  data: finalMergedUsage,
                  type: "data-usage",
                });
                return;
              }

              const summary = getUsage({ modelId, providers, usage });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ data: finalMergedUsage, type: "data-usage" });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ data: finalMergedUsage, type: "data-usage" });
            }
          },
          // Enable reasoning visibility for reasoning models
          providerOptions:
            selectedChatModel === "chat-model-reasoning"
              ? {
                  openai: getReasoningOpenAIOptions(),
                }
              : undefined,
          stopWhen: stepCountIs(5),
          system: systemPrompt({
            requestHints,
            selectedChatModel,
            userPreferences,
          }),
          tools,
        });

        result.consumeStream();

        // Merge the UI message stream (no per-chunk logging)
        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onError: () => "Oops, an error occurred!",
      onFinish: async ({ messages }) => {
        const streamDuration = Date.now() - streamStartTime;
        logWithTimestamp("✅ AI stream completed", {
          messageCount: messages.length,
          streamDuration: `${streamDuration}ms`,
          totalTokens: finalMergedUsage?.totalTokens,
        });

        // Log complete messages after streaming finishes (detailed)
        console.log(
          "[Complete Messages]",
          JSON.stringify(
            messages.map((m) => ({
              id: m.id,
              parts: m.parts.map((p) => {
                if (p.type === "reasoning") {
                  return {
                    textLength: p.text?.length ?? 0,
                    textPreview:
                      p.text?.slice(0, 150) +
                      (p.text && p.text.length > 150 ? "..." : ""),
                    type: p.type,
                  };
                }
                if (p.type === "text") {
                  return {
                    textLength: p.text?.length ?? 0,
                    textPreview:
                      p.text?.slice(0, 150) +
                      (p.text && p.text.length > 150 ? "..." : ""),
                    type: p.type,
                  };
                }
                if (p.type?.startsWith("tool-")) {
                  const toolPart = p as { state?: string; toolCallId?: string };
                  return {
                    state: toolPart.state,
                    toolCallId: toolPart.toolCallId,
                    type: p.type,
                  };
                }
                return { type: p.type };
              }),
              role: m.role,
            })),
            null,
            2
          )
        );

        const saveResponseStartTime = Date.now();
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            attachments: [],
            chat_id: id,
            created_at: new Date(),
            id: currentMessage.id,
            mentions: null,
            parts: currentMessage.parts,
            role: currentMessage.role,
            workspace_id: workspaceId,
          })),
        });
        logWithTimestamp("✓ AI response saved to DB", {
          duration: `${Date.now() - saveResponseStartTime}ms`,
          messageCount: messages.length,
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }

        logWithTimestamp("🏁 Request complete", {
          chatId: id,
          totalDuration: `${Date.now() - requestStartTime}ms`,
        });
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.user_id !== authUser.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
