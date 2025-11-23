# AI Chat Mentions Quick Reference

Quick reference guide for common tasks and patterns when working with the mentions system.

## Common Patterns

### Getting Mentionable Items

```tsx
import { useMentionableItems } from "@/hooks/use-mentionable-items";

function MyComponent() {
  const mentionableItems = useMentionableItems();
  // Use mentionableItems in Plate editor
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

### Extracting Mentions from Message

```tsx
import { extractMentionsFromMessage } from "@/lib/server/mentions/enrich";

const mentions = extractMentionsFromMessage(message);
// Returns array of MentionPart objects
```

### Enriching Message with Mentions

```tsx
import { createEnrichedMessageContent } from "@/lib/server/mentions/enrich";

const enrichedText = await createEnrichedMessageContent(message);
// Returns text with mention context prepended
```

### Creating a Mention Part

```tsx
import type { MentionPart } from "@/lib/types/mentions";

const mentionPart: MentionPart = {
  type: "mention",
  mention: {
    type: "table",
    tableName: "users",
    label: "Users Table",
    description: "All users",
  },
};
```

## Type Definitions

### Mention Types

```tsx
type MentionType = 
  | "page"      // Current page data
  | "block"     // Specific block
  | "table"     // Table lookup
  | "record"    // Specific record
  | "user"      // User profile
  | "lookup";   // Custom lookup
```

### Mention Metadata

```tsx
type MentionMetadata = {
  type: MentionType;
  id?: string;
  label: string;
  description?: string;
};
```

### Mentionable Item

```tsx
type MentionableItem = {
  key: string;           // Unique identifier
  text: string;          // Display text (e.g., "@thisPage")
  description?: string;  // Optional description
  icon?: string;         // Optional icon
  mention: MentionMetadata;
};
```

## File Locations

| Component | File Path |
|-----------|-----------|
| Type definitions | `lib/types/mentions.ts` |
| Context provider | `components/pages/mention-context.tsx` |
| Block hooks | `components/pages/hooks.ts` |
| Plate input | `components/input/plate-chat-input.tsx` |
| Mention input | `components/input/mention-input-element.tsx` |
| Server enrichment | `lib/server/mentions/enrich.ts` |
| Data extraction | `lib/server/mentions/extract.ts` |
| Chat API | `app/(legacy-chat)/api/chat/route.ts` |
| Multimodal input | `components/input/multimodal-input.tsx` |

## API Endpoints

### Get Table Data
```
GET /api/supabase/table?table={tableName}&page=1&limit=10
```

### Get Record Data
```
GET /api/supabase/record?table={tableName}&id={recordId}
```

## Common Issues & Solutions

### Issue: Mentions not appearing in dropdown

**Solution**: 
- Check that `MentionContextProvider` wraps the page
- Verify blocks are registering data
- Check browser console for errors

### Issue: Mentions not enriching message

**Solution**:
- Verify mention parts are in message.parts array
- Check server logs for extraction errors
- Ensure `createEnrichedMessageContent` is called

### Issue: Plate editor not working

**Solution**:
- Check Plate dependencies are installed
- Verify editor plugins configuration
- Check browser console for errors

## Testing Examples

### Test Mention Extraction

```tsx
import { extractMentionsFromMessage } from "@/lib/server/mentions/enrich";

const message = {
  parts: [
    { type: "mention", mention: { type: "page", label: "This Page" } },
    { type: "text", text: "analyze this" },
  ],
};

const mentions = extractMentionsFromMessage(message);
expect(mentions).toHaveLength(1);
```

### Test Data Extraction

```tsx
import { extractTableMentionData } from "@/lib/server/mentions/extract";

const mention = {
  type: "table",
  tableName: "users",
  label: "Users",
};

const data = await extractTableMentionData(mention);
expect(data).toContain("[Table: Users]");
```

## Code Snippets

### Add Mention to Message

```tsx
const messageParts = [
  { type: "mention", mention: myMention },
  { type: "text", text: "my message" },
];

sendMessage({
  role: "user",
  parts: messageParts,
});
```

### Filter Mentionable Items

```tsx
import { filterMentionableItems } from "@/lib/plate/mention-config";

const filtered = filterMentionableItems(items, searchQuery);
```

### Convert to Plate Format

```tsx
import { mentionableItemsToPlateMentions } from "@/lib/plate/mention-config";

const plateMentions = mentionableItemsToPlateMentions(mentionableItems);
```

## Next Steps

1. Complete Plate editor integration (see main docs)
2. Implement data extraction functions
3. Add UI polish (mention chips)
4. Add error handling
5. Write tests

For detailed instructions, see `docs/AI_CHAT_MENTIONS.md`.

