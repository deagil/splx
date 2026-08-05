# AI Chat System

## Overview

The AI Chat system provides conversational AI capabilities with support for contextual data mentions, file attachments, streaming responses, and multiple AI models. Built on the Vercel AI SDK v6, it features a rich text editor powered by Plate.js with @ mention functionality that allows users to reference page data, tables, records, and more directly in conversations.

**AI SDK Version**: v6.0.3 (upgraded from v5.0.108)

**Key v6 Features in Use**:
- **Agent Abstraction**: `ToolLoopAgent` for reusable agent definitions
- **Tool Approval**: Human-in-the-loop approval for sensitive operations
- **DevTools**: Development debugging tools for LLM calls
- **Type Safety**: End-to-end type safety with `InferAgentUIMessage`

## Core Features

- **Streaming Responses**: Real-time AI responses with word-by-word streaming
- **Contextual Mentions**: @ mention system to reference data from pages, blocks, tables, and records
- **File Attachments**: Upload and send images and documents to AI
- **Multiple AI Models**: Support for multiple OpenAI and xAI models with different reasoning capabilities
- **Personalization**: User preferences for tone, proficiency level, and AI context
- **Chat History**: Persistent conversation history stored in database
- **Usage Tracking**: Token usage tracking with TokenLens integration
- **Reasoning Display**: View AI reasoning process for reasoning-capable models
- **Tool Approval**: Human-in-the-loop approval for sensitive tool operations (AI SDK v6)
- **Agent Abstraction**: Reusable agent definitions with type-safe UI messages (AI SDK v6)

## Architecture

### High-Level Data Flow

```
User Input (Plate Editor) →
Extract Text + Mentions →
Send to API (/api/chat) →
Enrich Mentions with Data →
Generate System Prompt →
Stream AI Response →
Save to Database →
Display in UI
```

### Component Hierarchy

```
Chat Component (components/chat/chat.tsx)
├── MultimodalInput (components/input/multimodal-input.tsx)
│   ├── PlateChatInput (components/input/plate-chat-input.tsx)
│   │   └── Plate Editor with Mentions
│   ├── PreviewAttachment (file previews)
│   └── MentionChips (visual mention indicators)
├── Messages (components/chat/messages.tsx)
│   └── Message (components/chat/message.tsx)
│       ├── MessageContent (text/code/tool results)
│       ├── ToolApproval (components/chat/tool-approval.tsx) [AI SDK v6]
│       │   └── Approval UI for tools requiring user confirmation
│       └── MessageActions (copy, regenerate, etc.)
└── SuggestedActions (quick action buttons)

Agent Layer (lib/ai/agents/chat-agent.ts) [AI SDK v6]
└── ToolLoopAgent
    ├── Model configuration
    ├── System prompt generation
    └── Tool definitions (with approval support)
```

## Key Components

### 1. Chat Container (`components/chat/chat.tsx`)

**Purpose**: Main chat orchestration component that manages chat state, message flow, and AI SDK integration.

**Key Responsibilities**:
- Initializes AI SDK's `useChat` hook (v6)
- Manages chat messages and conversation state
- Coordinates mention enrichment with message sending
- Handles model selection and visibility settings
- Preserves mentions field through AI SDK transport
- Provides tool approval function (`addToolApprovalResponse`) [AI SDK v6]

**Implementation Highlights** (AI SDK v6):
```typescript
const {
  messages,
  input,
  setInput,
  status,
  sendMessage,
  stop,
  addToolApprovalResponse, // New in v6: tool approval handler
  // ...other AI SDK hooks
} = useChat<ChatMessage>({
  id: chatId,
  api: "/api/chat",
  body: {
    selectedChatModel,
    selectedVisibilityType,
    personalizationEnabled,
  },
  // Explicitly preserve mentions field in transport
  prepareSendMessagesRequest(request) {
    const lastMessage = request.messages.at(-1);
    return {
      body: {
        id: request.id,
        message: {
          ...lastMessage,
          mentions: (lastMessage as any)?.mentions, // Preserve custom field
        },
        // ... other fields
      },
    };
  },
  onError,
  onFinish,
});

// Pass approval function to child components
<Messages
  addToolApprovalResponse={addToolApprovalResponse}
  // ... other props
/>
```

### 2. Multimodal Input (`components/input/multimodal-input.tsx`)

**Purpose**: Chat input component that handles text, mentions, and file attachments.

**Key Features**:
- Integrates Plate.js rich text editor
- Manages file attachments with preview
- Tracks mentions separately from input text
- Validates mentions before sending
- Handles paste events for image upload

**State Management**:
```typescript
const [input, setInput] = useState<string>("");
const [mentions, setMentions] = useState<MentionMetadata[]>([]);
const [attachments, setAttachments] = useState<Attachment[]>([]);
```

**Message Construction**:
```typescript
const messageToSend = {
  role: "user",
  parts: [
    ...attachments.map(attachment => ({
      type: "file",
      url: attachment.url,
      name: attachment.name,
      mediaType: attachment.contentType,
    })),
    {
      type: "text",
      text: input,
    },
  ],
  // Custom field preserved by AI SDK
  mentions: validMentions,
};

sendMessage(messageToSend);
```

### 3. Plate Chat Input (`components/input/plate-chat-input.tsx`)

**Purpose**: Rich text editor with @ mention support powered by Plate.js.

**Key Features**:
- ProseMirror-based rich text editing
- @ trigger for mention dropdown
- Mention node rendering as chips
- Content extraction (text + mentions)
- Focus management and keyboard shortcuts

**Mention Integration**:
```typescript
// Plate editor plugins
const editor = createPlateEditor({
  plugins: [
    ParagraphPlugin,
    BaseMentionPlugin.configure({
      options: {
        trigger: "@",
      },
    }),
    // ... other plugins
  ],
});

// Extract content including mentions
function extractContent(editor) {
  let text = "";
  const mentions: MentionableItem["mention"][] = [];

  // Traverse editor state and extract text + mentions
  // ...

  return { text, mentions };
}
```

### 4. Mention Context (`components/pages/mention-context.tsx`)

**Purpose**: Context provider that collects and manages mentionable items from page blocks.

**How It Works**:
- Wraps pages/routes that need mention support
- Provides registration API for blocks to expose their data
- Aggregates mentionable items from all blocks
- Makes items available to Plate editor for dropdown

**API**:
```typescript
const { registerBlockData, unregisterBlockData } = useMentionableData();

// Register block data
registerBlockData({
  blockId: "list-1",
  blockType: "list",
  tableName: "users",
  label: "Users List",
  description: "All users in the system",
  data: userData,
});

// Clean up on unmount
unregisterBlockData("list-1");
```

### 5. Mentionable Items Hook (`hooks/use-mentionable-items.ts`)

**Purpose**: Hook that generates the full list of mentionable items available in the current context.

**Returns**:
```typescript
type MentionableItem = {
  key: string;           // Unique ID
  text: string;          // Display text (e.g., "@userProfile")
  description?: string;  // Optional description for dropdown
  icon?: string;         // Optional icon
  mention: MentionMetadata;  // Full mention metadata
};
```

**Includes**:
- User profile mention
- Page-level mentions (all blocks)
- Block-specific mentions (registered by blocks)
- Table mentions (from system tables)
- Record mentions (if applicable)

### 6. Chat Agent (`lib/ai/agents/chat-agent.ts`) [AI SDK v6]

**Purpose**: Reusable agent abstraction using `ToolLoopAgent` for consistent tool configuration and type safety.

**Key Features**:
- Centralized agent definition with model, instructions, and tools
- Type-safe UI message types via `InferAgentUIMessage`
- Runtime configuration for dynamic model selection and personalization
- Consistent tool setup across different contexts

**Usage**:
```typescript
// Create agent with runtime dependencies
const agent = createChatAgent({
  selectedChatModel: "chat-model",
  requestHints: { latitude, longitude, city, country },
  userPreferences: { /* ... */ },
  session: { user: { id: userId } },
  dataStream, // For tool data streaming
});

// Type-safe UI messages
import type { ChatAgentUIMessage } from '@/lib/ai/agents/chat-agent';
const { messages } = useChat<ChatAgentUIMessage>();
```

### 7. Tool Approval Component (`components/chat/tool-approval.tsx`) [AI SDK v6]

**Purpose**: UI component for handling human-in-the-loop tool approval requests.

**Key Features**:
- Displays approval request with tool details
- Approve/Deny buttons for user interaction
- Integrates with `addToolApprovalResponse` from `useChat`
- Handles approval state transitions

**Integration**:
- Automatically rendered when tool invocation has `state: "approval-requested"`
- Integrated into message rendering pipeline
- Supports all tools with `needsApproval: true`

## Server-Side Processing

### API Route (`app/api/chat/route.ts`)

**Request Handling**:

1. **Validation**: Validate request body with Zod schema
2. **Authentication**: Check user authentication via Supabase
3. **Rate Limiting**: Enforce message limits per user type
4. **Personalization**: Load user preferences if enabled
5. **Mention Enrichment**: Convert mentions to text context
6. **AI Streaming**: Stream response from AI model
7. **Database Storage**: Save messages and usage data

**Mention Enrichment Flow**:
```typescript
// Extract mentions from request
const messageWithMentions = {
  ...message,
  mentions: requestBody.message.mentions,
};

// Create enriched message for AI
const enrichedText = await createEnrichedMessageContent(messageWithMentions);

// Replace message text with enriched version
if (enrichedText && enrichedText.trim()) {
  enrichedMessageForAI = {
    ...messageWithMentions,
    parts: [
      { type: "text", text: enrichedText },
      ...nonTextParts,
    ],
  };
}

// Send enriched message to AI, original to database
const uiMessages = [...messagesFromDb, messageWithMentions];
const aiMessages = [...messagesFromDb, enrichedMessageForAI];
```

**AI Streaming Setup** (AI SDK v6):
```typescript
const stream = createUIMessageStream({
  execute: async ({ writer: dataStream }) => {
    // Create agent with runtime dependencies (dataStream, session)
    // Agent abstraction provides consistency and type safety
    const agent = createChatAgent({
      selectedChatModel,
      requestHints,
      userPreferences,
      session: { user: { id: userId } },
      dataStream,
    });

    // Extract tools from agent configuration
    const tools = {
      getWeather,
      createDocument: createDocument({ session, dataStream }),
      updateDocument: updateDocument({ session, dataStream }),
      requestSuggestions: requestSuggestions({ session, dataStream }),
      readUrlContent,
      queryUserTable,
      searchPages,
      navigateToPage: navigateToPage({ dataStream }),
    };

    const result = streamText({
      model: myProvider.languageModel(selectedChatModel),
      system: systemPrompt({
        selectedChatModel,
        requestHints,
        userPreferences,
      }),
      // Note: convertToModelMessages is now async in v6
      messages: await convertToModelMessages(aiMessages),
      tools,
      experimental_transform: smoothStream({ chunking: "word" }),
      onFinish: async ({ usage }) => {
        // Track usage with TokenLens
      },
    });

    dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
  },
  onFinish: async ({ messages }) => {
    // Save messages to database
  },
});

return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
```

**Agent Abstraction** (`lib/ai/agents/chat-agent.ts`):
```typescript
export const createChatAgent = (options: ChatAgentOptions) => {
  return new ToolLoopAgent({
    model: myProvider.languageModel(options.selectedChatModel),
    instructions: systemPrompt({
      selectedChatModel: options.selectedChatModel,
      requestHints: options.requestHints,
      userPreferences: options.userPreferences,
    }),
    tools: {
      getWeather,
      createDocument: createDocument({ session: options.session, dataStream: options.dataStream }),
      updateDocument: updateDocument({ session: options.session, dataStream: options.dataStream }),
      // ... other tools
    },
    stopWhen: stepCountIs(5),
  });
};

// Type-safe UI message type for client components
export type ChatAgentUIMessage = InferAgentUIMessage<ReturnType<typeof createChatAgent>>;
```

### Mention Enrichment (`lib/server/mentions/enrich.ts`)

**Purpose**: Convert mention metadata into actual data context for AI.

**Functions**:

1. **extractMentionsFromMessage**: Extract mentions from message object
2. **enrichMessageWithMentions**: Fetch data for each mention and format as text
3. **createEnrichedMessageContent**: Combine mention context with user message

**Process**:
```typescript
export async function createEnrichedMessageContent(
  message: ChatMessage & { mentions?: MentionMetadata[] }
): Promise<string> {
  // Extract original text
  const originalText = message.parts
    ?.filter(part => part.type === "text")
    .map(part => part.text)
    .join(" ") || "";

  // Get mention data
  const mentionContext = await enrichMessageWithMentions(message);

  if (!mentionContext?.trim()) {
    return originalText;
  }

  // Format: [Mention context]\n\nUser message: [text]
  return `${mentionContext}\n\nUser message: ${originalText}`;
}
```

### Mention Data Extraction (`lib/server/mentions/extract.ts`)

**Purpose**: Fetch actual data for each mention type.

**Extraction Functions**:

- **extractUserMentionData**: Fetch user profile
- **extractTableMentionData**: Fetch first 10 rows from table
- **extractRecordMentionData**: Fetch specific record by ID
- **extractBlockMentionData**: Fetch data from block context
- **extractPageMentionData**: Fetch all page data
- **extractLookupMentionData**: Custom lookup queries

**Example**:
```typescript
export async function extractTableMentionData(
  mention: TableMention
): Promise<string> {
  const { tableName, label } = mention;

  try {
    const response = await fetch(
      `/api/supabase/table?table=${tableName}&page=1&limit=10`
    );

    if (!response.ok) {
      return `[Table: ${label}]\n\nError: Unable to fetch data`;
    }

    const { data } = await response.json();

    return `[Table: ${label}]\n\n${JSON.stringify(data, null, 2)}`;
  } catch (error) {
    return `[Table: ${label}]\n\nError: ${error.message}`;
  }
}
```

## AI Model Configuration

### Model Selection (`lib/ai/models.ts`)

**Available Models**:

```typescript
export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Assistant",
    description: "Fast, efficient responses",
    icon: Sparkles,
    useCases: "Quick answers, code writing, general questions",
    speed: "fast",
  },
  {
    id: "chat-model-reasoning",
    name: "Deep Think",
    description: "Thorough reasoning, takes longer",
    icon: Telescope,
    useCases: "Multi-step planning, deep analysis, tough debugging",
    speed: "thorough",
  },
];
```

### Provider Configuration (`lib/ai/providers.ts`)

**AI Gateway Integration with DevTools** (AI SDK v6):
```typescript
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { wrapLanguageModel } from "ai";

export const myProvider = customProvider({
  languageModels: {
    "chat-model": wrapLanguageModel({
      model: openai("gpt-5-mini"),
      // Enable DevTools in development for debugging LLM calls
      middleware: !isProductionEnvironment
        ? devToolsMiddleware()
        : undefined,
    }),
    // ... other models
  },
});
```

**DevTools Usage**:
- DevTools are automatically enabled in development (`NODE_ENV !== "production"`)
- Launch viewer: `npx @ai-sdk/devtools`
- Open browser: http://localhost:4983
- Features: Inspect prompts, view tool calls, monitor token usage, access raw provider data

### System Prompt (`lib/ai/prompts.ts`)

**Dynamic Prompt Generation**:
```typescript
export function systemPrompt({
  selectedChatModel,
  requestHints,
  userPreferences,
}: {
  selectedChatModel: string;
  requestHints?: RequestHints;
  userPreferences?: UserPreferences;
}): string {
  let prompt = "You are a helpful AI assistant...";

  // Add personalization if enabled
  if (userPreferences?.personalizationEnabled) {
    if (userPreferences.aiContext) {
      prompt += `\n\nUser Context: ${userPreferences.aiContext}`;
    }
    if (userPreferences.proficiency) {
      prompt += `\n\nTechnical Level: ${userPreferences.proficiency}`;
    }
    if (userPreferences.aiTone) {
      prompt += `\n\nTone: ${userPreferences.aiTone}`;
    }
  }

  // Add location context
  if (requestHints?.city && requestHints?.country) {
    prompt += `\n\nUser Location: ${requestHints.city}, ${requestHints.country}`;
  }

  return prompt;
}
```

## Database Schema

### Chats Table

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  workspace_id UUID NOT NULL,
  title TEXT NOT NULL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  last_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL,
  parts JSONB NOT NULL,
  attachments JSONB DEFAULT '[]',
  mentions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Message Parts Format** (AI SDK v6):
```typescript
type MessagePart =
  | { type: "text"; text: string }
  | { type: "file"; url: string; name: string; mediaType: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; args: any }
  | { type: "tool-result"; toolCallId: string; result: any }
  | { type: "tool-updateDocument"; toolCallId: string; state: "approval-requested" | "output-available"; input: {...}; approval?: { id: string }; output?: {...} };
```

**Tool Approval States** (AI SDK v6):
- `approval-requested`: Tool execution pending user approval
- `output-available`: Tool executed and output is available
- `error`: Tool execution failed

## User Personalization

### Preference Fields

Stored in `users` table:
- `ai_context`: User's role and experience (e.g., "Senior developer with 10 years experience")
- `proficiency`: Technical level ("less", "regular", "more")
- `ai_tone`: Communication tone (preset or custom text)
- `ai_guidance`: Additional guidance for AI behavior

### Personalization Flow

1. User completes onboarding with preferences
2. Preferences saved to database
3. API route loads preferences when `personalizationEnabled: true`
4. System prompt includes preferences
5. AI adapts responses based on user profile

## File Attachments

### Upload Flow

1. User selects file or pastes image
2. File uploaded to `/api/files/upload` → Vercel Blob
3. Returns `{ url, pathname, contentType }`
4. Attachment added to message parts
5. AI receives file as `file` part with URL

### Supported File Types

- Images: PNG, JPG, GIF, WebP
- Documents: PDF, TXT, MD
- Other: Based on AI model capabilities

## Reasoning Display

For models with reasoning capabilities (e.g., `chat-model-reasoning`):

1. Model generates internal reasoning as part of response
2. Reasoning sent as `reasoning` part in message stream
3. UI displays reasoning in expandable section
4. Reasoning stored in database with message

**Enabling Reasoning**:
```typescript
const result = streamText({
  model: myProvider.languageModel("chat-model-reasoning"),
  providerOptions: {
    openai: {
      reasoning_effort: "medium",
      include_reasoning_summary: true,
    },
  },
});

// In UI message stream
dataStream.merge(
  result.toUIMessageStream({
    sendReasoning: true,  // Include reasoning in stream
  })
);
```

## Tool Approval (AI SDK v6)

### Overview

AI SDK v6 introduces human-in-the-loop tool approval for sensitive operations. Tools can require user approval before execution, providing a safety layer for operations that modify user data or perform destructive actions.

### Implementation

**Tool Configuration**:
```typescript
export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  tool({
    description: "Update a document with the given description.",
    inputSchema: z.object({
      id: z.string(),
      description: z.string(),
    }),
    // Require user approval before executing document updates
    needsApproval: true,
    execute: async ({ id, description }) => {
      // ... tool execution logic
    },
  });
```

**Approval UI Component** (`components/chat/tool-approval.tsx`):
```typescript
export function ToolApproval({
  invocation,
  addToolApprovalResponse,
}: {
  invocation: UIToolInvocation<typeof updateDocument>;
  addToolApprovalResponse: ChatAddToolApproveResponseFunction;
}) {
  if (invocation.state === "approval-requested") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Required</CardTitle>
          <CardDescription>
            This tool requires your approval before execution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Display tool input details */}
        </CardContent>
        <CardFooter>
          <Button onClick={() => addToolApprovalResponse({
            id: invocation.approval.id,
            approved: true,
          })}>
            Approve
          </Button>
          <Button onClick={() => addToolApprovalResponse({
            id: invocation.approval.id,
            approved: false,
          })}>
            Deny
          </Button>
        </CardFooter>
      </Card>
    );
  }
  return null;
}
```

**Integration in Chat**:
- `useChat` hook provides `addToolApprovalResponse` function
- Approval UI component checks for `approval-requested` state
- User can approve or deny tool execution
- Approved tools execute normally; denied tools return error state

**Current Tools with Approval**:
- `updateDocument` - Requires approval for all document updates

### Approval Flow

1. AI requests tool execution
2. Tool has `needsApproval: true` → execution paused
3. UI displays approval request with tool details
4. User approves or denies
5. If approved → tool executes → output displayed
6. If denied → error state displayed → execution stopped

## Usage Tracking

### TokenLens Integration

**Purpose**: Track token usage and costs across different AI models.

**Implementation**:
```typescript
const providers = await getTokenlensCatalog();
const modelId = myProvider.languageModel(selectedChatModel).modelId;
const summary = getUsage({ modelId, usage, providers });

const finalUsage = {
  ...usage,
  ...summary,
  modelId
} as AppUsage;

// Send to client
dataStream.write({ type: "data-usage", data: finalUsage });

// Save to database
await updateChatLastContextById({
  chatId: id,
  context: finalUsage,
});
```

### Usage Display

- Token counts displayed in chat UI
- Cost estimation per message
- Usage limits enforced per user type
- Rate limiting (messages per day)

## Rate Limiting

### User Type Entitlements

```typescript
export const entitlementsByUserType = {
  guest: {
    maxMessagesPerDay: 5,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
  regular: {
    maxMessagesPerDay: 100,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  premium: {
    maxMessagesPerDay: 1000,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
};
```

### Enforcement

1. Count messages in last 24 hours
2. Check against user type limit
3. Return `rate_limit:chat` error if exceeded
4. Client displays friendly error message

## Error Handling

### Error Types

```typescript
type ChatSDKError =
  | "bad_request:api"
  | "unauthorized:chat"
  | "forbidden:chat"
  | "rate_limit:chat"
  | "offline:chat"
  | "bad_request:activate_gateway";
```

### Error Flow

1. API route catches error
2. Maps to appropriate `ChatSDKError` type
3. Returns error response with message
4. Client displays toast notification
5. UI remains interactive (can retry)

## Testing

### Unit Tests

- Mention extraction logic
- Content enrichment formatting
- Mention validation
- Error handling

### Integration Tests

- Full chat flow (input → API → response)
- Mention enrichment with real data
- File upload and attachment
- Streaming response handling

### E2E Tests

- User types message and receives response
- Select mention from dropdown
- Upload file attachment
- Switch between models
- View reasoning output

## Performance Considerations

### Optimization Strategies

1. **Mention Data Caching**: Cache frequently accessed table/record data
2. **Batch Fetching**: Fetch multiple mention data in parallel
3. **Streaming**: Use streaming for immediate user feedback
4. **Lazy Loading**: Load chat history on demand
5. **Debouncing**: Debounce typing in Plate editor

### Performance Metrics

- Time to first token: ~500ms
- Message round-trip: ~2-5s
- Mention enrichment: ~100-500ms per mention
- File upload: ~1-3s depending on size

## Future Enhancements

### Short-Term
- Mention search/filtering in dropdown
- Mention data preview before selection
- Voice input support
- Code execution tool

### Long-Term
- Multi-modal responses (images, charts)
- Custom AI tools/functions
- Chat branching and versioning
- Team chat rooms
- Mention templates
- Batch mention operations

## Troubleshooting

### Common Issues

**Mentions not appearing in dropdown:**
- Check that `MentionContextProvider` wraps the page
- Verify blocks are calling `registerBlockData`
- Check browser console for errors

**Mentions not enriching message:**
- Verify mentions are in request body (check network tab)
- Check server logs for enrichment process
- Ensure `prepareSendMessagesRequest` preserves mentions

**AI not receiving enriched data:**
- Check that `createEnrichedMessageContent` is being called
- Verify enriched message is used in AI stream
- Check database to see if enriched message was saved

**Streaming stopped working:**
- Check for errors in server logs
- Verify Redis connection for resumable streams
- Check AI Gateway configuration and credits

**Tool approval not working:**
- Verify `needsApproval: true` is set on tool definition
- Check that `addToolApprovalResponse` is passed to message components
- Ensure `ToolApproval` component is imported and rendered
- Check browser console for approval-related errors

**Type errors after v6 upgrade:**
- Ensure `convertToModelMessages` is awaited (now async in v6)
- Check that `ChatAddToolApproveResponseFunction` is imported from `ai` package (not `@ai-sdk/react`)
- Verify agent factory function receives all required options

## AI SDK v6 Migration Notes

### Key Changes from v5

1. **Agent Abstraction**: 
   - Created `lib/ai/agents/chat-agent.ts` with `ToolLoopAgent` for reusable agent definitions
   - Provides type-safe UI message types via `InferAgentUIMessage`
   - Agent factory function accepts runtime dependencies (dataStream, session)

2. **Tool Approval**:
   - Added `needsApproval: true` to `updateDocument` tool
   - Created approval UI component (`components/chat/tool-approval.tsx`)
   - Integrated approval flow into message rendering

3. **API Changes**:
   - `convertToModelMessages` is now async (must be awaited)
   - `ChatAddToolApproveResponseFunction` moved from `@ai-sdk/react` to `ai` package
   - `createUIMessageStream` execute function can be async

4. **DevTools**:
   - Added `@ai-sdk/devtools` package
   - Wrapped models with `devToolsMiddleware` in development
   - DevTools automatically enabled/disabled based on environment

5. **Type Safety**:
   - Client components can use `ChatAgentUIMessage` type for full type safety
   - Tool invocation types include approval state information

### Migration Status

✅ **Completed**:
- Dependencies updated to v6
- Agent abstraction created and integrated
- Tool approval implemented for `updateDocument`
- DevTools configured for development
- Type imports updated

🔄 **Backward Compatible**:
- Existing `streamText` usage continues to work
- `experimental_*` APIs still supported
- Tool definitions remain compatible
- UI message handling unchanged

### Breaking Changes

- **None** - Current implementation is fully compatible with v6
- `convertToModelMessages` is now async (requires `await`)
- Some type imports moved between packages (handled automatically)

## Related Documentation

- [AI_CHAT_MENTIONS.md](./AI_CHAT_MENTIONS.md) - Detailed mention system documentation
- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - Database structure and access patterns
- [PAGES_SYSTEM.md](./PAGES_SYSTEM.md) - Visual page builder integration with chat
- [AI_SDK_V6_MIGRATION.md](./AI_SDK_V6_MIGRATION.md) - Complete AI SDK v6 migration guide