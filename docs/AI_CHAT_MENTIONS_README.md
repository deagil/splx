# AI Chat Mentions Feature - Developer Guide

## Overview

This feature enables users to reference data from pages, blocks, tables, and records in AI chat messages using `@` mentions. Mentions appear as visual chips in the UI and are automatically converted to structured text context when sent to the AI model.

## Documentation Structure

1. **[Main Documentation](./AI_CHAT_MENTIONS.md)** - Complete implementation guide with architecture, code examples, and step-by-step instructions
2. **[Implementation Checklist](./AI_CHAT_MENTIONS_CHECKLIST.md)** - Trackable checklist for completing the feature
3. **[Quick Reference](./AI_CHAT_MENTIONS_QUICK_REFERENCE.md)** - Common patterns, code snippets, and troubleshooting

## Current Status

### ✅ Completed (Foundation)
- Type system and schemas
- Page context provider for collecting mentionable data
- Block hooks that automatically register data
- Server-side mention enrichment infrastructure
- Chat API integration
- Basic Plate editor components

### ⚠️ In Progress
- Plate editor integration into chat input
- Text/mention extraction from Plate editor

### ❌ Not Started
- Data extraction implementation (currently placeholders)
- UI polish (mention chips)
- Error handling
- Testing

## Quick Start

1. **Read the main documentation**: Start with [AI_CHAT_MENTIONS.md](./AI_CHAT_MENTIONS.md) for complete understanding
2. **Review the checklist**: Use [AI_CHAT_MENTIONS_CHECKLIST.md](./AI_CHAT_MENTIONS_CHECKLIST.md) to track progress
3. **Start with Phase 1**: Complete Plate editor integration (see main docs, Step 1)
4. **Reference as needed**: Use [AI_CHAT_MENTIONS_QUICK_REFERENCE.md](./AI_CHAT_MENTIONS_QUICK_REFERENCE.md) for common patterns

## Key Concepts

### Mention Flow
```
User types @ → Dropdown shows → User selects → Chip appears → 
Message sent → Server extracts data → AI receives enriched context
```

### Component Hierarchy
```
multimodal-input.tsx
  └─ PlateChatInput
      └─ MentionContextProvider (from page)
          └─ Block hooks (register data)
```

### Server Processing
```
Message with mentions → Extract mentions → Fetch data → 
Format as text → Prepend to message → Send to AI
```

## Implementation Priority

1. **High Priority** (Required for basic functionality):
   - Complete Plate editor integration
   - Fix text/mention extraction
   - Implement basic data extraction

2. **Medium Priority** (Required for good UX):
   - Add mention chips UI
   - Error handling
   - Data size limits

3. **Low Priority** (Polish):
   - Advanced error messages
   - Performance optimization
   - Comprehensive testing

## Getting Help

- **Architecture questions**: See "Architecture" section in main docs
- **Implementation questions**: See "Implementation Guide" in main docs
- **Code patterns**: See Quick Reference guide
- **Troubleshooting**: See "Troubleshooting" section in main docs

## Related Features

This feature integrates with:
- **Pages System**: Uses page blocks to provide mentionable data
- **Chat System**: Enhances chat messages with context
- **Plate Editor**: Uses Plate for rich text editing with mentions
- **Database System**: Fetches data from user tables

## Next Developer Steps

1. Read [AI_CHAT_MENTIONS.md](./AI_CHAT_MENTIONS.md) completely
2. Review existing code in mentioned files
3. Start with Step 1 in the Implementation Guide
4. Use the checklist to track progress
5. Reference Quick Reference for code patterns

Good luck! 🚀

