# AI Chat Mentions System

## Overview

The AI Chat Mentions system allows users to reference data from the current page, specific blocks, or perform data lookups by using `@` mentions in the chat input. Mentions appear as visual chips in the UI but are converted to structured text context when sent to the AI model, providing the AI with relevant data to answer questions more accurately.

### Key Features

- **@ Page Mentions**: Reference all data from the current page
- **@ Block Mentions**: Reference specific block data (list, record, etc.)
- **@ Table Mentions**: Lookup data from tables
- **@ Record Mentions**: Reference specific records
- **@ User Mentions**: Reference user profile data
- **Visual Affordances**: Mentions appear as chips in the UI
- **Server-Side Enrichment**: Mentions are converted to text context before sending to AI

## Architecture

### High-Level Flow

```
User types @ → Plate editor shows mention dropdown → User selects mention → 
Mention chip appears → Message sent with mentions → Server extracts mention data → 
Data formatted as text → AI receives enriched message
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat Input Component                     │
│              (multimodal-input.tsx)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Plate Editor with Mentions                     │
│              (plate-chat-input.tsx)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Mention Context Provider                          │
│  (components/pages/mention-context.tsx)                     │
│  - Collects mentionable data from blocks                   │
│  - Provides mentionable items to editor                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Block Hooks                                     │
│  - useListBlockData registers list block data               │
│  - useRecordBlockData registers record block data           │
└─────────────────────────────────────────────────────────────┘
```

### Server-Side Flow

```
Message with mentions → extractMentionsFromMessage() → 
extractMentionData() for each mention → 
createEnrichedMessageContent() → 
Enriched text prepended to message → AI model
```

## Data Flow

### 1. Client Side (Input)

When a user types a mention:

1. **Plate Editor** (`components/input/plate-chat-input.tsx`):
   - User types `@` to trigger mention dropdown
   - User selects a mention from the dropdown
   - Mention is stored in Plate editor as a mention node with `type: "mention"` and `value: "@userProfile"` (or JSON stringified mention data)
   - Editor extracts both text and mentions from the editor state

2. **Mention Extraction**:
   - `extractContent()` function traverses the Plate editor tree
   - Finds mention nodes by type and `key` property
   - Looks up mention metadata from `mentionableItems` using the `key`
   - Returns both text (with `@mentionText` included) and mention metadata array

3. **Message Construction** (`components/input/multimodal-input.tsx`):
   - Mentions are stored in component state
   - When message is sent, mentions are added as a custom `mentions` field on the message object
   - Message is sent via AI SDK's `DefaultChatTransport`

### 2. Transport Layer

The `prepareSendMessagesRequest` function in `components/chat/chat.tsx` explicitly preserves the `mentions` field:

```typescript
prepareSendMessagesRequest(request) {
  const lastMessage = request.messages.at(-1);
  return {
    body: {
      id: request.id,
      message: {
        ...lastMessage,
        mentions: (lastMessage as any)?.mentions, // Explicitly preserve
      },
      // ... other fields
    },
  };
}
```

### 3. Server Side (API Route)

When the message arrives at `/api/chat`:

1. **Request Validation** (`app/(legacy-chat)/api/chat/schema.ts`):
   - Zod schema validates the request body
   - `mentions` field is optional and validated against mention schemas

2. **Mention Extraction** (`lib/server/mentions/enrich.ts`):
   - `extractMentionsFromMessage()` extracts mentions from the `mentions` field
   - Returns array of `MentionPart` objects

3. **Data Enrichment**:
   - `enrichMessageWithMentions()` calls `extractMentionData()` for each mention
   - Each mention type has a specific extraction function that fetches actual data
   - Data is formatted as readable text

4. **Message Enrichment**:
   - `createEnrichedMessageContent()` combines mention contexts with original message text
   - Format: `[Mention contexts]\n\nUser message: [original text]`
   - Enriched message replaces the original text parts

5. **Database Storage**:
   - Enriched message (with actual data) is saved to the database
   - Original message with mentions is also preserved in the message object

6. **AI Model**:
   - Enriched message is sent to the AI model
   - AI receives actual data, not just mention placeholders

### 4. Data Extraction (`lib/server/mentions/extract.ts`)

Each mention type has a dedicated extraction function:

- **`extractUserMentionData()`**: Fetches user profile from `users` table
- **`extractTableMentionData()`**: Fetches first 10 rows from specified table
- **`extractRecordMentionData()`**: Fetches specific record by ID
- **`extractBlockMentionData()`**: Fetches data from list/record blocks
- **`extractPageMentionData()`**: Fetches page metadata and block data
- **`extractLookupMentionData()`**: Placeholder for custom lookups

## Implementation Status

### ✅ Completed

1. **Type System** (`lib/types/mentions.ts`)
   - All mention type definitions
   - Zod schemas for validation
   - TypeScript types for type safety

2. **Plate Editor Integration**
   - `PlateChatInput` component fully integrated
   - Mention extraction from editor state working
   - Text and mentions properly extracted
   - Mentions included in message when sent

3. **Server-Side Processing**
   - Mention extraction utilities
   - Mention enrichment system
   - Chat API integration
   - Data extraction for all mention types
   - Enriched messages saved to database

4. **Transport Layer**
   - Mentions preserved through AI SDK transport
   - Request schema includes mentions field

5. **Authentication**
   - All API routes use Supabase authentication
   - User context properly resolved

### ⚠️ Partially Implemented

1. **UI Polish**
   - Mention chips display in input area ✅
   - Visual feedback for mentions ✅
   - Mention removal functionality ✅
   - Could use more visual polish

2. **Error Handling**
   - Basic error handling in place
   - Could use more user-friendly error messages
   - Could add loading states for data fetching

### ❌ Not Started

1. **Testing**
   - Unit tests for mention extraction
   - Integration tests for mention flow
   - E2E tests for mention selection

2. **Performance Optimization**
   - Mention data caching
   - Batch data fetching for multiple mentions

## Quick Reference

### Getting Mentionable Items

```tsx
import { useMentionableItems } from "@/hooks/use-mentionable-items";

function MyComponent() {
  const mentionableItems = useMentionableItems();
  // Returns array of MentionableItem objects
}
```

### Registering Block Data

```tsx
import { useMentionableData } from "@/components/pages/mention-context";

function MyBlock() {
  const { registerBlockData, unregisterBlockData } = useMentionableData();
  
  useEffect(() => {
    if (data) {
      registerBlockData({
        blockId: "my-block",
        blockType: "list",
        tableName: "users",
        label: "Users List",
        description: "List of all users",
        data: myData,
      });
    }
    return () => unregisterBlockData("my-block");
  }, [data]);
}
```

### Extracting Mentions from Message (Server-Side)

```tsx
import { extractMentionsFromMessage } from "@/lib/server/mentions/enrich";

const mentions = extractMentionsFromMessage(message);
// Returns array of MentionPart objects
```

### Enriching Message with Mentions (Server-Side)

```tsx
import { createEnrichedMessageContent } from "@/lib/server/mentions/enrich";

const enrichedText = await createEnrichedMessageContent(message);
// Returns text with mention context prepended
// Format: "[Mention contexts]\n\nUser message: [original text]"
```

### Type Definitions

```tsx
// Mention types
type MentionType = 
  | "page"      // Current page data
  | "block"     // Specific block
  | "table"     // Table lookup
  | "record"    // Specific record
  | "user"      // User profile
  | "lookup";   // Custom lookup

// Mention metadata
type MentionMetadata = {
  type: MentionType;
  id?: string;
  label: string;
  description?: string;
};

// Mentionable item (for UI)
type MentionableItem = {
  key: string;           // Unique identifier
  text: string;          // Display text (e.g., "@userProfile")
  description?: string;  // Optional description
  icon?: string;         // Optional icon
  mention: MentionMetadata;
};
```

## File Structure

### Core Files

| Component | File Path |
|-----------|-----------|
| Type definitions | `lib/types/mentions.ts` |
| Context provider | `components/pages/mention-context.tsx` |
| Block hooks | `components/pages/hooks.ts` |
| Plate input | `components/input/plate-chat-input.tsx` |
| Mention input element | `components/input/mention-input-element.tsx` |
| Mention chip | `components/input/mention-chip.tsx` |
| Server enrichment | `lib/server/mentions/enrich.ts` |
| Data extraction | `lib/server/mentions/extract.ts` |
| Chat API | `app/(legacy-chat)/api/chat/route.ts` |
| Chat API schema | `app/(legacy-chat)/api/chat/schema.ts` |
| Multimodal input | `components/input/multimodal-input.tsx` |
| Chat component | `components/chat/chat.tsx` |
| Mentionable items hook | `hooks/use-mentionable-items.ts` |
| Plate config | `lib/plate/mention-config.ts` |

## API Endpoints Used

### Get Table Data
```
GET /api/supabase/table?table={tableName}&page=1&limit=10
```

### Get Record Data
```
GET /api/supabase/record?table={tableName}&id={recordId}
```

## Troubleshooting

### Mentions Not Appearing in Dropdown

**Possible Causes:**
- `MentionContextProvider` not wrapping the page
- Blocks not registering their data
- `useMentionableItems` hook not being called

**Solutions:**
- Check that `MentionContextProvider` wraps the page component
- Verify blocks are calling `registerBlockData` in their `useEffect`
- Check browser console for errors
- Verify `mentionableItems` array is being passed to `PlateChatInput`

### Mentions Not Being Extracted

**Possible Causes:**
- Mention node structure doesn't match expected format
- `key` property missing or incorrect
- Mention not found in `mentionableItems` lookup

**Solutions:**
- Check browser console for extraction logs
- Verify mention node has `type: "mention"` and `key` property
- Ensure `mentionableItems` includes the mention with matching `key`
- Check that `extractContent` function is being called on editor changes

### Mentions Not Enriching Message

**Possible Causes:**
- Mentions not included in message when sent
- Transport not preserving mentions field
- Server schema not accepting mentions
- Mentions not in request body

**Solutions:**
- Check browser network tab to see if mentions are in request
- Verify `prepareSendMessagesRequest` preserves mentions
- Check server logs for `[Chat API] Received mentions:`
- Ensure Zod schema includes `mentions` field
- Verify `messageWithMentions` includes mentions from request body

### AI Not Receiving Enriched Data

**Possible Causes:**
- Enrichment not happening
- Enriched text not replacing original text
- Data extraction failing

**Solutions:**
- Check server logs for `[Chat API] Message enriched with mention data`
- Verify `createEnrichedMessageContent` is being called
- Check that `enrichedMessage` is used in `uiMessages` array
- Verify data extraction functions are working (check server logs for errors)
- Check database to see if enriched message was saved

### Input Field Not Working After Sending Message

**Possible Causes:**
- Plate editor not resetting properly
- Editor focus not being restored
- Editor disabled state not clearing

**Solutions:**
- Check that `value` prop is being cleared after submit
- Verify `isExternalUpdate` flag is working correctly
- Check that editor focus is being restored when enabled
- Ensure `status` returns to `"ready"` after message is sent

## Code Patterns

### Adding a New Mention Type

1. **Add type to `lib/types/mentions.ts`**:
   ```tsx
   export const newMentionSchema = mentionMetadataSchema.extend({
     type: z.literal("newType"),
     // Add type-specific fields
     customField: z.string(),
   });
   
   export type NewMention = z.infer<typeof newMentionSchema>;
   ```

2. **Add to Mention union**:
   ```tsx
   export type Mention = 
     | PageMention
     | BlockMention
     | // ... existing types
     | NewMention;
   ```

3. **Add extraction function in `lib/server/mentions/extract.ts`**:
   ```tsx
   export async function extractNewMentionData(
     mention: NewMention
   ): Promise<string> {
     // Fetch and format data
     return `[New Type: ${mention.label}]\n\n${formattedData}`;
   }
   ```

4. **Add case in `extractMentionData`**:
   ```tsx
   case "newType":
     return extractNewMentionData(mention);
   ```

5. **Update API schema** (`app/(legacy-chat)/api/chat/schema.ts`):
   ```tsx
   const mentionSchema = z.union([
     // ... existing schemas
     newMentionSchema,
   ]);
   ```

### Adding Mentions to Non-Page Routes

For routes that aren't custom pages (e.g., `/app/tables/[table]`):

1. **Wrap route with MentionContextProvider**:
   ```tsx
   <MentionContextProvider>
     {/* Route content */}
   </MentionContextProvider>
   ```

2. **Register mentionable data**:
   ```tsx
   const { registerBlockData } = useMentionableData();
   
   useEffect(() => {
     registerBlockData({
       blockId: "table-view",
       blockType: "list",
       tableName: tableName,
       label: `Table: ${tableName}`,
       data: tableData,
     });
   }, [tableName, tableData]);
   ```

## Example: Complete Mention Flow

### User Types "@userProfile"

1. **Client**: User types `@` in Plate editor
2. **Client**: Dropdown shows "User Profile" option
3. **Client**: User selects "User Profile"
4. **Client**: Mention chip appears with "User Profile" label
5. **Client**: Editor extracts: `{ text: "@User Profile", mentions: [{ type: "user", label: "User Profile" }] }`
6. **Client**: Message sent with `mentions: [{ type: "user", label: "User Profile" }]`
7. **Server**: Receives message with mentions field
8. **Server**: Calls `extractUserMentionData()` which:
   - Gets current user ID from Supabase auth
   - Fetches user profile from `users` table
   - Formats as: `[User Profile: User Profile]\n\n  id: ...\n  email: ...\n  firstname: ...`
9. **Server**: Combines with original message: `[User Profile data]\n\nUser message: what about after this hyphen - @User Profile`
10. **Server**: Saves enriched message to database
11. **Server**: Sends enriched message to AI model
12. **AI**: Receives actual user profile data, not just "@User Profile" text

## Future Enhancements

1. **Text Selection Mentions**: Allow users to highlight text and mention it
2. **Mention Search**: Filter mentions by typing after `@`
3. **Mention Templates**: Pre-defined mention queries
4. **Mention Permissions**: Only show mentions user has access to
5. **Mention Caching**: Cache mention data for performance
6. **Mention Analytics**: Track which mentions are used most
7. **Batch Data Fetching**: Optimize when multiple mentions are in one message
8. **Mention Preview**: Show data preview in dropdown before selection

## Related Documentation

- [Database Architecture](./DATABASE_ARCHITECTURE.md) - For understanding table structure and data access
- [Pages System](./pages-migration.md) - For understanding how pages and blocks work

## Questions or Issues?

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Check browser console for client-side errors
4. Verify all components are properly connected
5. Check that authentication is working (mentions require authenticated user)
