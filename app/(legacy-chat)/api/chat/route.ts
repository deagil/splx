import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { UserType } from "@/app/(legacy-auth)/auth";
import type { VisibilityType } from "@/components/shared/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { getReasoningOpenAIOptions } from "@/lib/ai/openai-config";
import {
  type RequestHints,
  systemPrompt,
  type UserPreferences,
} from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { readUrlContent } from "@/lib/ai/tools/read-url-content";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { role, user, workspace, workspaceUser } from "@/lib/db/schema";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
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
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";
import { createEnrichedMessageContent } from "@/lib/server/mentions/enrich";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err,
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 }, // 24 hours
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
          " > Resumable streams are disabled due to missing REDIS_URL",
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
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

    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userId = authUser.id;

    // Extract skill from message (from slash commands)
    const skill = (message as any).skill;

    // Fetch user preferences and context for personalization
    let userPreferences: UserPreferences | undefined;

    // Always fetch if we have a skill, or if personalization is enabled
    if (personalizationEnabled || skill) {
      try {
        const sql = postgres(process.env.POSTGRES_URL!);
        const db = drizzle(sql);

        try {
          // Fetch user data with profile fields
          const [userData] = await db
            .select({
              firstname: user.firstname,
              lastname: user.lastname,
              job_title: user.job_title,
              ai_context: user.ai_context,
              proficiency: user.proficiency,
              ai_tone: user.ai_tone,
              ai_guidance: user.ai_guidance,
            })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

          // Fetch workspace data using tenant context
          let workspaceData:
            | { name: string; description: string | null }
            | undefined;
          let roleLabel: string | undefined;

          try {
            const tenant = await resolveTenantContext();
            const currentWorkspaceId = tenant.workspaceId;

            if (currentWorkspaceId) {
              // Get workspace details
              const [ws] = await db
                .select({
                  name: workspace.name,
                  description: workspace.description,
                })
                .from(workspace)
                .where(eq(workspace.id, currentWorkspaceId))
                .limit(1);

              if (ws) {
                workspaceData = ws;
              }

              // Get user's role in this workspace
              const [workspaceUserData] = await db
                .select({
                  role_id: workspaceUser.role_id,
                })
                .from(workspaceUser)
                .where(
                  and(
                    eq(workspaceUser.user_id, userId),
                    eq(workspaceUser.workspace_id, currentWorkspaceId),
                  ),
                )
                .limit(1);

              if (workspaceUserData?.role_id) {
                // Get the role label
                const [roleData] = await db
                  .select({
                    label: role.label,
                  })
                  .from(role)
                  .where(
                    and(
                      eq(role.id, workspaceUserData.role_id),
                      eq(role.workspace_id, currentWorkspaceId),
                    ),
                  )
                  .limit(1);

                if (roleData) {
                  roleLabel = roleData.label;
                }
              }
            }
          } catch (error) {
            // If tenant context resolution fails, continue without workspace/role data
            console.warn(
              "Error resolving tenant context for personalization:",
              error,
            );
          }

          userPreferences = {
            // User profile
            firstName: userData?.firstname,
            lastName: userData?.lastname,
            jobTitle: userData?.job_title,
            // AI preferences
            aiContext: userData?.ai_context,
            proficiency: userData?.proficiency,
            aiTone: userData?.ai_tone,
            aiGuidance: userData?.ai_guidance,
            personalizationEnabled: personalizationEnabled ?? false,
            // Workspace context
            workspaceName: workspaceData?.name,
            workspaceDescription: workspaceData?.description,
            // Role context
            roleLabel,
            // Skill context (from slash commands)
            skillPrompt: skill?.prompt,
            skillName: skill?.name,
          };
        } finally {
          await sql.end({ timeout: 5 });
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error);
        // If we have a skill but failed to fetch preferences, still include the skill
        if (skill) {
          userPreferences = {
            personalizationEnabled: false,
            skillPrompt: skill.prompt,
            skillName: skill.name,
          };
        }
      }
    }

    // Authenticated users via Supabase are "regular" users
    const userType: UserType = "regular";

    const messageCount = await getMessageCountByUserId({
      id: userId,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let workspaceId: string;

    if (chat) {
      if (chat.user_id !== userId) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      workspaceId = chat.workspace_id;
      // Only fetch messages if chat already exists
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      // Get workspace_id from tenant context for new chat
      const tenant = await resolveTenantContext();
      workspaceId = tenant.workspaceId;

      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId,
        title,
        visibility: selectedVisibilityType,
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

    // Debug: Log mentions received from client
    if (
      messageWithMentions.mentions && messageWithMentions.mentions.length > 0
    ) {
      console.log(
        "[Chat API] Received mentions:",
        messageWithMentions.mentions,
      );
    }

    // Create enriched message for AI (with mention data as text)
    let enrichedMessageForAI = messageWithMentions;
    const enrichedText = await createEnrichedMessageContent(
      messageWithMentions,
    );

    // Debug: Log enrichment result
    if (enrichedText && enrichedText.trim()) {
      console.log(
        "[Chat API] Message enriched with mention data, length:",
        enrichedText.length,
      );
    }

    // If we have enriched text (mentions converted to text), create version for AI
    if (enrichedText && enrichedText.trim() && message.parts) {
      // Replace all text parts with the enriched text (which includes mention context + user message)
      const nonTextParts = message.parts.filter((part) => part.type !== "text");
      enrichedMessageForAI = {
        ...messageWithMentions,
        parts: [
          { type: "text", text: enrichedText },
          ...nonTextParts,
        ],
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
      longitude,
      latitude,
      city,
      country,
    };

    // Save the original message to database (preserve original text and mentions separately)
    // This allows us to display mentions as chips in the UI while sending enriched text to AI
    await saveMessages({
      messages: [
        {
          chat_id: id,
          id: message.id,
          role: "user",
          parts: message.parts, // Use original parts (not enriched) for display
          attachments: [],
          mentions: messageWithMentions.mentions || null, // Store mentions separately
          created_at: new Date(),
          workspace_id: workspaceId,
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            userPreferences,
          }),
          messages: convertToModelMessages(
            // Replace the last message (user message) with enriched version for AI
            uiMessages.slice(0, -1).concat([enrichedMessageForAI]),
          ),
          stopWhen: stepCountIs(5),
          experimental_activeTools: selectedChatModel === "chat-model-reasoning"
            ? []
            : [
              "getWeather",
              "createDocument",
              "updateDocument",
              "requestSuggestions",
              "readUrlContent",
            ],
          experimental_transform: smoothStream({
            chunking: "word",
            delayInMs: 20,
          }),
          // Enable reasoning visibility for reasoning models
          providerOptions: selectedChatModel === "chat-model-reasoning"
            ? {
              openai: getReasoningOpenAIOptions(),
            }
            : undefined,
          tools: {
            getWeather,
            createDocument: createDocument({
              session: { user: { id: userId } } as any,
              dataStream,
            }),
            updateDocument: updateDocument({
              session: { user: { id: userId } } as any,
              dataStream,
            }),
            requestSuggestions: requestSuggestions({
              session: { user: { id: userId } } as any,
              dataStream,
            }),
            readUrlContent,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();

        // Merge the UI message stream (no per-chunk logging)
        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Log complete messages after streaming finishes
        console.log(
          "[Complete Messages]",
          JSON.stringify(
            messages.map((m) => ({
              id: m.id,
              role: m.role,
              parts: m.parts.map((p) => {
                if (p.type === "reasoning") {
                  return {
                    type: p.type,
                    textLength: p.text?.length ?? 0,
                    textPreview: p.text?.substring(0, 150) +
                      (p.text && p.text.length > 150 ? "..." : ""),
                  };
                }
                if (p.type === "text") {
                  return {
                    type: p.type,
                    textLength: p.text?.length ?? 0,
                    textPreview: p.text?.substring(0, 150) +
                      (p.text && p.text.length > 150 ? "..." : ""),
                  };
                }
                if (p.type?.startsWith("tool-")) {
                  const toolPart = p as { state?: string; toolCallId?: string };
                  return {
                    type: p.type,
                    state: toolPart.state,
                    toolCallId: toolPart.toolCallId,
                  };
                }
                return { type: p.type };
              }),
            })),
            null,
            2,
          ),
        );

        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            created_at: new Date(),
            attachments: [],
            chat_id: id,
            workspace_id: workspaceId,
            mentions: null,
          })),
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
      },
      onError: () => {
        return "Oops, an error occurred!";
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
        "AI Gateway requires a valid credit card on file to service requests",
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
