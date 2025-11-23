# AI Chat Mentions System Documentation

## Overview

The AI Chat Mentions system allows users to reference data from the current page, specific blocks, or perform data lookups by using `@` mentions in the chat input. Mentions appear as visual chips in the UI but are converted to structured text context when sent to the AI model, providing the AI with relevant data to answer questions more accurately.

### Key Features

- **@ Page Mentions**: Reference all data from the current page
- **@ Block Mentions**: Reference specific block data (list, record, etc.)
- **@ Table Mentions**: Lookup data from tables
- **@ Record Mentions**: Reference specific records
- **@ User Mentions**: Reference user profile data
- **Visual Affordances**: Mentions appear as chips/attachments in the UI
- **Server-Side Enrichment**: Mentions are converted to text context before sending to AI

## Architecture

### High-Level Flow

```
User types @ → Plate editor shows mention dropdown → User selects mention → 
Mention chip appears → Message sent → Server extracts mention data → 
Data formatted as text → AI receives enriched message
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat Input Component                     │
│  (multimodal-input.tsx - needs Plate integration)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Plate Editor with Mentions                     │
│  (plate-chat-input.tsx - basic structure exists)           │
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
│              Block Hooks (hooks.ts)                         │
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

## Current Implementation Status

### ✅ Completed

1. **Type System** (`lib/types/mentions.ts`)
   - All mention type definitions
   - Zod schemas for validation
   - TypeScript types for type safety

2. **Page Context System**
   - `MentionContextProvider` - Collects data from blocks
   - Block hooks register their data automatically
   - `PageViewer` wrapped with context provider

3. **Server-Side Processing**
   - Mention extraction utilities
   - Mention enrichment system
   - Chat API integration

4. **Plate Components (Basic)**
   - Custom `MentionInputElement` component
   - Basic `PlateChatInput` structure
   - Mention configuration utilities

### ⚠️ Partially Implemented

1. **Plate Editor Integration**
   - Basic structure exists but not integrated into `multimodal-input.tsx`
   - Text/mention extraction logic needs refinement
   - Editor state management incomplete

2. **Data Extraction**
   - Placeholder implementations in `extract.ts`
   - Need to implement actual data fetching from database/APIs

### ❌ Not Started

1. **UI Polish**
   - Mention chips display in input area
   - Visual feedback for mentions
   - Mention removal functionality

2. **Error Handling**
   - Handle missing mention data gracefully
   - User-friendly error messages

3. **Testing**
   - Unit tests for mention extraction
   - Integration tests for mention flow
   - E2E tests for mention selection

## Implementation Guide

### Step 1: Complete Plate Editor Integration

**File**: `components/input/multimodal-input.tsx`

**Current State**: Uses basic textarea (`PromptInputTextarea`)

**Required Changes**:

1. **Replace textarea with Plate editor**:
   ```tsx
   // Import the Plate chat input
   import { PlateChatInput } from "./plate-chat-input";
   import { useMentionableItems } from "@/hooks/use-mentionable-items";
   
   // In PureMultimodalInput component:
   const mentionableItems = useMentionableItems();
   
   // Replace PromptInputTextarea with:
   <PlateChatInput
     value={input}
     onChange={setInput}
     onMentionsChange={(mentions) => {
       // Store mentions for later use
       setMentions(mentions);
     }}
     mentionableItems={mentionableItems}
     placeholder="Send a message..."
     disabled={status !== "ready"}
     autoFocus={width && width > 768}
   />
   ```

2. **Store mentions in component state**:
   ```tsx
   const [mentions, setMentions] = useState<MentionableItem["mention"][]>([]);
   ```

3. **Include mentions in message parts when sending**:
   ```tsx
   const submitForm = useCallback(() => {
     const messageParts = [
       ...attachments.map((attachment) => ({
         type: "file" as const,
         url: attachment.url,
         name: attachment.name,
         mediaType: attachment.contentType,
       })),
       // Add mention parts
       ...mentions.map((mention) => ({
         type: "mention" as const,
         mention,
       })),
       {
         type: "text",
         text: input,
       },
     ];
     
     sendMessage({
       role: "user",
       parts: messageParts,
     });
     
     // Reset state
     setAttachments([]);
     setMentions([]);
     setInput("");
   }, [input, mentions, attachments, sendMessage]);
   ```

**Key Considerations**:
- Plate editor needs proper initialization with mention plugin
- Text extraction from Plate editor state must handle mentions correctly
- Editor should maintain focus and cursor position
- Handle edge cases (empty input, only mentions, etc.)

### Step 2: Fix Plate Editor Text Extraction

**File**: `components/input/plate-chat-input.tsx`

**Current Issue**: The `extractContent` function needs to properly traverse Plate's editor state and extract both text and mentions.

**Required Changes**:

1. **Use Plate's built-in serialization**:
   ```tsx
   import { getPlateEditorValue } from "platejs/react";
   
   const extractContent = useCallback(() => {
     if (!editor) return { text: "", mentions: [] };
     
     const value = getPlateEditorValue(editor);
     const textParts: string[] = [];
     const mentions: MentionableItem["mention"][] = [];
     
     // Traverse Plate value structure
     function traverse(node: any) {
       if (node.type === "mention" && node.value) {
         const mention = parsePlateMentionValue(node.value);
         if (mention) {
           mentions.push(mention);
           // Get mention text from children
           const mentionText = node.children
             ?.map((child: any) => child.text || "")
             .join("") || "";
           textParts.push(`@${mentionText}`);
         }
       } else if (node.children) {
         node.children.forEach(traverse);
       } else if (node.text) {
         textParts.push(node.text);
       }
     }
     
     value.forEach(traverse);
     
     return {
       text: textParts.join(" ").trim(),
       mentions,
     };
   }, [editor]);
   ```

2. **Handle editor changes properly**:
   ```tsx
   useEffect(() => {
     if (!editor) return;
     
     const handleChange = () => {
       const { text, mentions } = extractContent();
       onChange(text);
       onMentionsChange?.(mentions);
     };
     
     // Use Plate's onChange event
     editor.onChange = handleChange;
   }, [editor, onChange, onMentionsChange, extractContent]);
   ```

**Key Considerations**:
- Plate uses Slate under the hood, so editor state is a tree structure
- Mentions are nodes with type "mention" and a value property
- Text nodes have type "text" or are children of paragraph nodes
- Need to handle nested structures correctly

### Step 3: Implement Data Extraction

**File**: `lib/server/mentions/extract.ts`

**Current State**: Placeholder implementations return static text

**Required Changes**:

1. **Implement `extractPageMentionData`**:
   ```tsx
   export async function extractPageMentionData(
     mention: PageMention
   ): Promise<string> {
     try {
       const tenant = await resolveTenantContext();
       const page = await getPageById(tenant, mention.id || "");
       
       if (!page) {
         return `[Page: ${mention.label}]\n\nPage not found.`;
       }
       
       // Get all blocks from the page
       const blocks = page.blocks || [];
       const blockData: string[] = [];
       
       for (const block of blocks) {
         if (block.type === "list" && block.tableName) {
           // Fetch list block data
           const data = await fetchListBlockData(block);
           blockData.push(`List Block (${block.tableName}):\n${formatListData(data)}`);
         } else if (block.type === "record" && block.tableName) {
           // Fetch record block data
           const data = await fetchRecordBlockData(block);
           blockData.push(`Record Block (${block.tableName}):\n${formatRecordData(data)}`);
         }
       }
       
       return `[Page: ${mention.label}]\n\n${blockData.join("\n\n")}`;
     } catch (error) {
       console.error("Error extracting page mention data:", error);
       return `[Page: ${mention.label}]\n\nError loading page data.`;
     }
   }
   ```

2. **Implement `extractTableMentionData`**:
   ```tsx
   export async function extractTableMentionData(
     mention: TableMention
   ): Promise<string> {
     try {
       const tenant = await resolveTenantContext();
       const resourceStore = await getResourceStore(tenant);
       
       if (!isSqlAdapter(resourceStore)) {
         return `[Table: ${mention.tableName}]\n\nDatabase connection not available.`;
       }
       
       // Use existing API endpoint or direct database query
       // Option 1: Use existing API
       const response = await fetch(
         `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/supabase/table?table=${mention.tableName}&page=1&limit=10`
       );
       
       if (!response.ok) {
         throw new Error("Failed to fetch table data");
       }
       
       const data = await response.json();
       
       // Format data
       const rows = data.rows?.slice(0, 10).map((row: any, idx: number) => {
         const fields = Object.entries(row)
           .map(([key, value]) => `  ${key}: ${String(value)}`)
           .join("\n");
         return `Row ${idx + 1}:\n${fields}`;
       }).join("\n\n") || "No data";
       
       return `[Table: ${mention.tableName}]\n\n${rows}`;
     } catch (error) {
       console.error("Error extracting table mention data:", error);
       return `[Table: ${mention.tableName}]\n\nError loading data: ${error instanceof Error ? error.message : "Unknown error"}`;
     }
   }
   ```

3. **Implement `extractRecordMentionData`**:
   ```tsx
   export async function extractRecordMentionData(
     mention: RecordMention
   ): Promise<string> {
     try {
       // Use existing API endpoint
       const response = await fetch(
         `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/supabase/record?table=${mention.tableName}&id=${mention.recordId}`
       );
       
       if (!response.ok) {
         throw new Error("Failed to fetch record data");
       }
       
       const data = await response.json();
       
       if (!data.record) {
         return `[Record: ${mention.tableName}:${mention.recordId}]\n\nRecord not found.`;
       }
       
       const fields = Object.entries(data.record)
         .map(([key, value]) => `  ${key}: ${String(value)}`)
         .join("\n");
       
       return `[Record: ${mention.tableName}:${mention.recordId}]\n\n${fields}`;
     } catch (error) {
       console.error("Error extracting record mention data:", error);
       return `[Record: ${mention.tableName}:${mention.recordId}]\n\nError loading data: ${error instanceof Error ? error.message : "Unknown error"}`;
     }
   }
   ```

**Key Considerations**:
- Use existing API endpoints where possible to maintain consistency
- Handle errors gracefully with user-friendly messages
- Limit data size to avoid token limits (e.g., first 10 rows)
- Consider caching for frequently accessed data
- Respect user permissions (don't expose data user can't access)

### Step 4: Add Mention Chips UI

**File**: `components/input/multimodal-input.tsx`

**Required Changes**:

1. **Create mention chip component** (new file: `components/input/mention-chip.tsx`):
   ```tsx
   "use client";
   
   import { X } from "lucide-react";
   import type { MentionMetadata } from "@/lib/types/mentions";
   import { Button } from "@/components/ui/button";
   import { cn } from "@/lib/utils";
   
   export function MentionChip({
     mention,
     onRemove,
   }: {
     mention: MentionMetadata;
     onRemove: () => void;
   }) {
     return (
       <div
         className={cn(
           "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm",
           "border border-border"
         )}
       >
         <span className="font-medium">{mention.label}</span>
         <Button
           type="button"
           variant="ghost"
           size="sm"
           className="h-4 w-4 p-0"
           onClick={onRemove}
         >
           <X className="h-3 w-3" />
         </Button>
       </div>
     );
   }
   ```

2. **Display mention chips above input**:
   ```tsx
   // In PureMultimodalInput component, before the input:
   {mentions.length > 0 && (
     <div className="flex flex-wrap gap-2 px-2">
       {mentions.map((mention, idx) => (
         <MentionChip
           key={`${mention.type}-${mention.id || idx}`}
           mention={mention}
           onRemove={() => {
             setMentions((prev) => prev.filter((_, i) => i !== idx));
           }}
         />
       ))}
     </div>
   )}
   ```

**Key Considerations**:
- Chips should be visually distinct from attachments
- Remove button should be clear and accessible
- Handle overflow (many mentions) gracefully
- Maintain mention order

### Step 5: Handle Edge Cases

**Files**: Multiple

**Required Changes**:

1. **Empty mentions**: Don't send mention parts if array is empty
2. **Invalid mentions**: Validate mentions before sending
3. **Missing data**: Handle cases where mention data can't be fetched
4. **Permission errors**: Don't expose data user can't access
5. **Large data**: Truncate or summarize large datasets

**Example validation**:
```tsx
// In submitForm:
const validMentions = mentions.filter((mention) => {
  // Basic validation
  if (!mention.type || !mention.label) return false;
  // Type-specific validation
  if (mention.type === "table" && !mention.tableName) return false;
  if (mention.type === "record" && (!mention.tableName || !mention.recordId)) return false;
  return true;
});
```

### Step 6: Testing

**Required Tests**:

1. **Unit Tests**:
   - Mention type validation
   - Mention extraction from Plate editor
   - Data extraction functions
   - Mention enrichment

2. **Integration Tests**:
   - Full mention flow (select → send → enrich)
   - Multiple mentions in one message
   - Mention with text

3. **E2E Tests**:
   - User selects mention from dropdown
   - Mention appears as chip
   - Message sent with mention
   - AI receives enriched context

**Test Files to Create**:
- `__tests__/lib/server/mentions/enrich.test.ts`
- `__tests__/lib/server/mentions/extract.test.ts`
- `__tests__/components/input/plate-chat-input.test.tsx`
- `__tests__/e2e/mentions.spec.ts`

## Code Patterns and Examples

### Registering Block Data

Blocks automatically register their data when they mount:

```tsx
// In useListBlockData hook (already implemented):
useEffect(() => {
  if (data && block.tableName) {
    registerBlockData({
      blockId: block.id,
      blockType: "list",
      tableName: block.tableName,
      label: `List: ${block.tableName}`,
      description: `${data.rows.length} rows from ${block.tableName}`,
      data,
    });
  }
  return () => {
    unregisterBlockData(block.id);
  };
}, [data, block.id, block.tableName, registerBlockData, unregisterBlockData]);
```

### Adding New Mention Types

1. **Add type to `lib/types/mentions.ts`**:
   ```tsx
   export type NewMentionType = "newType";
   
   export const newMentionSchema = mentionMetadataSchema.extend({
     type: z.literal("newType"),
     // Add type-specific fields
   });
   ```

2. **Add extraction function in `lib/server/mentions/extract.ts`**:
   ```tsx
   export async function extractNewMentionData(
     mention: NewMention
   ): Promise<string> {
     // Implementation
   }
   ```

3. **Add case in `extractMentionData`**:
   ```tsx
   case "newType":
     return extractNewMentionData(mention);
   ```

### Adding Mentions to Non-Page Routes

For routes that aren't custom pages (e.g., `/app/tables/[table]`):

1. **Create route-specific mention context**:
   ```tsx
   // In the route component
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

## Troubleshooting

### Mentions Not Appearing in Dropdown

- Check that `MentionContextProvider` wraps the page
- Verify blocks are registering data (check console logs)
- Ensure `useMentionableItems` hook is being called
- Check that mentionable items are being passed to Plate editor

### Mentions Not Enriching Message

- Verify mention parts are included in message parts array
- Check server logs for extraction errors
- Ensure `createEnrichedMessageContent` is being called
- Verify mention data extraction functions are working

### Plate Editor Not Working

- Check that Plate dependencies are installed
- Verify editor plugins are configured correctly
- Check browser console for errors
- Ensure mention plugin is properly initialized

## Future Enhancements

1. **Text Selection Mentions**: Allow users to highlight text and mention it
2. **Mention Search**: Filter mentions by typing after `@`
3. **Mention Templates**: Pre-defined mention queries
4. **Mention Permissions**: Only show mentions user has access to
5. **Mention Caching**: Cache mention data for performance
6. **Mention Analytics**: Track which mentions are used most

## Related Files

### Core Files
- `lib/types/mentions.ts` - Type definitions
- `components/pages/mention-context.tsx` - Context provider
- `components/pages/hooks.ts` - Block data registration
- `lib/server/mentions/enrich.ts` - Server-side enrichment
- `lib/server/mentions/extract.ts` - Data extraction

### Integration Points
- `components/input/multimodal-input.tsx` - Chat input (needs Plate integration)
- `components/input/plate-chat-input.tsx` - Plate editor component
- `app/(legacy-chat)/api/chat/route.ts` - Chat API (enrichment integrated)

### Supporting Files
- `lib/plate/mention-config.ts` - Plate configuration utilities
- `components/input/mention-input-element.tsx` - Custom mention input
- `hooks/use-mentionable-items.ts` - Hook for getting mentionable items

## Questions or Issues?

If you encounter issues or have questions:

1. Check the troubleshooting section above
2. Review the code patterns and examples
3. Check existing implementations in similar features
4. Consult the Plate.js documentation: https://platejs.org/docs

