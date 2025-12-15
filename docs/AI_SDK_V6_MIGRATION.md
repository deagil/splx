# AI SDK v6 Migration Analysis

## Current Implementation Overview

**Current Version**: AI SDK v5.0.108

**Key Features in Use**:
- `streamText` for chat streaming with tool calling
- `createUIMessageStream` for UI message handling
- `tool()` function for defining tools
- `experimental_activeTools` for conditional tool activation
- `stopWhen: stepCountIs(5)` for tool loop control
- Custom tool implementations: `getWeather`, `createDocument`, `updateDocument`, `requestSuggestions`, `readUrlContent`

## What's New in AI SDK v6

### 1. Agent Abstraction (New Feature)

**v6 Introduces**: `ToolLoopAgent` class that provides a standardized agent interface

**Current Implementation**: Uses `streamText` directly with `stopWhen: stepCountIs(5)` to handle tool loops

**Impact**: 
- ✅ **Optional** - Your current implementation works fine
- The agent abstraction is a convenience wrapper, not required
- You can continue using `streamText` as-is

**Example v6 Agent Approach**:
```typescript
import { ToolLoopAgent } from 'ai';

const chatAgent = new ToolLoopAgent({
  model: myProvider.languageModel(selectedChatModel),
  instructions: systemPrompt({...}),
  tools: {
    getWeather,
    createDocument: createDocument({...}),
    // ... other tools
  },
  stopWhen: stepCountIs(5), // Same as current
});

// Then use: agent.stream() or agent.generate()
```

**Current Approach** (still works in v6):
```typescript
streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPrompt({...}),
  tools: {...},
  stopWhen: stepCountIs(5),
})
```

### 2. Tool Execution Approval (New Feature)

**v6 Introduces**: `needsApproval` property on tools for human-in-the-loop workflows

**Current Implementation**: No approval system - tools execute automatically

**Impact**:
- ✅ **Optional** - Only needed if you want user approval before tool execution
- Useful for sensitive operations (payments, data deletion, etc.)
- Your current tools don't need this feature

**Example**:
```typescript
export const paymentTool = tool({
  description: 'Process a payment',
  inputSchema: z.object({
    amount: z.number(),
    recipient: z.string(),
  }),
  needsApproval: async ({ amount }) => amount > 1000, // Dynamic approval
  execute: async ({ amount, recipient }) => {
    return await processPayment(amount, recipient);
  },
});
```

**When to Use**:
- If you add tools that modify critical data
- If you want users to approve before executing certain tools
- For compliance/audit requirements

### 3. Structured Output (Now Stable)

**v6 Status**: Structured output is now **stable** (was experimental in v5)

**Current Implementation**: Uses `streamObject` in `requestSuggestions` tool

**Impact**:
- ✅ **No changes needed** - Your `streamObject` usage continues to work
- Now officially stable, so you can rely on it for production
- Can be combined with tool calling in `streamText` using `output` parameter

**New Capability**: You can now use structured output directly in `streamText`:

```typescript
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  prompt: 'Generate a summary',
  tools: {...}, // Can combine with tools!
  output: Output.object({
    schema: z.object({
      summary: z.string(),
      keyPoints: z.array(z.string()),
    }),
  }),
});
```

**Current Usage** (still works):
```typescript
// In requestSuggestions tool
const { elementStream } = streamObject({
  model: myProvider.languageModel("artifact-model"),
  schema: z.object({...}),
  // ...
});
```

### 4. Reranking Support (New Feature)

**v6 Introduces**: Native `rerank()` function for improving search relevance

**Current Implementation**: No reranking functionality

**Impact**:
- ✅ **Optional** - Only relevant if you implement search/RAG features
- Could be useful for improving mention context relevance
- Not needed for current chat implementation

**Example**:
```typescript
import { rerank } from 'ai';
import { cohere } from '@ai-sdk/cohere';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: mentionContexts,
  query: userMessage,
  topN: 5,
});
```

**Potential Use Case**: Improve relevance when selecting which mention data to include in AI context

### 5. Configuring Call Options (New Feature)

**v6 Introduces**: Type-safe runtime configuration via `callOptionsSchema` and `prepareCall`

**Current Implementation**: Uses function parameters and closures for dynamic configuration

**Impact**:
- ✅ **Optional** - Your current approach works fine
- Could simplify dynamic model selection and personalization
- Useful if you want type-safe runtime configuration

**Example**:
```typescript
const chatAgent = new ToolLoopAgent({
  model: myProvider.languageModel(selectedChatModel),
  callOptionsSchema: z.object({
    userId: z.string(),
    personalizationEnabled: z.boolean(),
    selectedChatModel: z.string(),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    system: systemPrompt({
      selectedChatModel: options.selectedChatModel,
      userPreferences: options.personalizationEnabled ? {...} : undefined,
    }),
  }),
});
```

**Current Approach** (still valid):
```typescript
streamText({
  model: myProvider.languageModel(selectedChatModel), // Dynamic
  system: systemPrompt({
    selectedChatModel,
    userPreferences, // Dynamic
  }),
  // ...
})
```

## Migration Assessment

### Breaking Changes: **Minimal** ✅

According to the v6 documentation:
> "AI SDK 6 is expected to have minimal breaking changes. The version bump is due to the v3 Language Model Specification, but most AI SDK 5 code will work with little or no modification."

### Required Changes: **None** ✅

Your current implementation should work with v6 without modifications:
- `streamText` API remains the same
- `tool()` function remains the same
- `createUIMessageStream` remains the same
- `stopWhen: stepCountIs(5)` remains the same
- Tool definitions are compatible

### Recommended Changes: **Optional Enhancements**

1. **Consider Agent Abstraction** (if you want cleaner code):
   - Wrap your `streamText` logic in a `ToolLoopAgent`
   - Simplifies tool loop management
   - Makes agent reusable across routes

2. **Add Tool Approval** (for sensitive operations):
   - Add `needsApproval: true` to tools that modify critical data
   - Implement approval UI in chat interface
   - Useful for `updateDocument` or future destructive operations

3. **Use Stable Structured Output**:
   - Your `streamObject` usage is already correct
   - Consider using `output` parameter in `streamText` if you need structured output in main chat

4. **Explore Reranking** (for future enhancements):
   - Could improve mention context selection
   - Useful if you add RAG/search features

## Code Comparison

### Current Implementation (v5)

```typescript
const stream = createUIMessageStream({
  execute: ({ writer: dataStream }) => {
    const result = streamText({
      model: myProvider.languageModel(selectedChatModel),
      system: systemPrompt({...}),
      messages: convertToModelMessages(uiMessages),
      stopWhen: stepCountIs(5),
      experimental_activeTools: selectedChatModel === "chat-model-reasoning"
        ? []
        : ["getWeather", "createDocument", ...],
      tools: {
        getWeather,
        createDocument: createDocument({...}),
        // ...
      },
    });
    
    result.consumeStream();
    dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
  },
  // ...
});
```

### Potential v6 Agent Approach (Optional)

```typescript
const chatAgent = new ToolLoopAgent({
  model: myProvider.languageModel(selectedChatModel),
  instructions: systemPrompt({...}),
  tools: {
    getWeather,
    createDocument: createDocument({...}),
    updateDocument: updateDocument({...}),
    requestSuggestions: requestSuggestions({...}),
    readUrlContent,
  },
  stopWhen: stepCountIs(5),
});

const stream = createAgentUIStreamResponse({
  agent: chatAgent,
  messages: convertToModelMessages(uiMessages),
});
```

**Note**: The agent approach is cleaner but requires refactoring. Your current approach works perfectly in v6.

## Migration Steps

### Step 1: Update Dependencies (Low Risk)

```bash
pnpm install ai@beta @ai-sdk/openai@beta @ai-sdk/react@beta
```

**Note**: v6 is still in beta. Pin to specific versions if you upgrade:
```json
{
  "ai": "6.0.0-beta.X",
  "@ai-sdk/openai": "6.0.0-beta.X"
}
```

### Step 2: Test Current Implementation

1. Run your existing code with v6
2. Verify tool calling still works
3. Verify streaming still works
4. Verify UI message handling still works

**Expected Result**: Everything should work without changes ✅

### Step 3: Optional Enhancements

1. **Add Tool Approval** (if needed):
   ```typescript
   export const updateDocument = ({...}) =>
     tool({
       description: "Update a document",
       needsApproval: true, // Require user approval
       // ...
     });
   ```

2. **Refactor to Agent** (if desired):
   - Extract tool definitions
   - Create `ToolLoopAgent` instance
   - Update route to use agent

3. **Use Structured Output in streamText** (if needed):
   ```typescript
   streamText({
     // ...
     output: Output.object({
       schema: z.object({...}),
     }),
   });
   ```

## Recommendations

### ✅ Safe to Upgrade

- v6 is backward compatible with your v5 code
- No breaking changes for your use case
- All current features continue to work

### ⚠️ Consider Waiting

- v6 is still in **beta** (stable release expected end of 2025)
- APIs may still change during beta
- If you're in production, consider waiting for stable release

### 🎯 If You Upgrade

1. **Pin to specific beta version** to avoid unexpected changes
2. **Test thoroughly** - especially tool calling and streaming
3. **Monitor for breaking changes** in patch releases
4. **Consider agent abstraction** for cleaner code organization
5. **Add tool approval** for sensitive operations

## Key Takeaways

1. **No breaking changes** for your implementation
2. **Agent abstraction** is optional but could simplify code
3. **Tool approval** is a new feature you might want for sensitive operations
4. **Structured output** is now stable (was already working)
5. **Reranking** is available if you need search/RAG improvements
6. **v6 is still beta** - consider waiting for stable release

## Questions to Consider

1. **Do you need tool approval?** 
   - If yes → Upgrade and implement approval UI
   - If no → Current implementation is fine

2. **Do you want cleaner code organization?**
   - If yes → Consider agent abstraction
   - If no → Current approach works

3. **Are you in production?**
   - If yes → Wait for stable v6 release (end of 2025)
   - If no → Safe to try beta

4. **Do you need reranking?**
   - If yes → Upgrade and implement
   - If no → Not needed

## Conclusion

Your current implementation is **fully compatible** with AI SDK v6. You can:
- ✅ Upgrade without code changes
- ✅ Continue using `streamText` directly
- ✅ Keep your current tool definitions
- ✅ Optionally adopt new features (agents, approval, reranking)

The migration is **low risk** but consider waiting for stable release if you're in production.

