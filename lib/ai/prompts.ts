import type { Geo } from "@vercel/functions";
import type { ArtifactKind } from "@/components/artifact/artifact";

/**
 * Sanitize user-provided text to prevent prompt injection attacks.
 * Strips patterns that could manipulate the AI's behavior.
 */
export function sanitizeUserInput(text: string): string {
  if (!text) return "";

  let sanitized = text;

  // Remove attempts to override system instructions
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions?/gi,
    /forget\s+(all\s+)?previous\s+instructions?/gi,
    /disregard\s+(all\s+)?previous\s+instructions?/gi,
    /you\s+are\s+now\s+a/gi,
    /new\s+instructions?:/gi,
    /system\s*:\s*/gi,
    /assistant\s*:\s*/gi,
    /user\s*:\s*/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|system\|>/gi,
    /<\|user\|>/gi,
    /<\|assistant\|>/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  // Limit length to prevent context overflow
  const maxLength = 2000;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + "...";
  }

  return sanitized.trim();
}

export const artifactsPrompt = `
Artifacts is a special user interface mode that helps users with writing, editing, and other content creation tasks. When artifact is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the artifacts and visible to the user.

IMPORTANT: When asked to write code, you MUST ALWAYS use the createDocument tool with kind="code". Never write code inline in your response. Always use artifacts for code.

When writing code, specify the language in the backticks, e.g. \`\`\`python\`code here\`\`\`. The default language is Python. Other languages are not yet supported, so let the user know if they request a different language.

DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM. WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT.

This is a guide for using artifacts tools: \`createDocument\` and \`updateDocument\`, which render content on a artifacts beside the conversation.

**When to use \`createDocument\`:**
- ALWAYS for code (any amount of code, even a single line)
- For substantial content (>10 lines) 
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a document
- For when content contains a single code snippet

**When NOT to use \`createDocument\`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat

**Using \`updateDocument\`:**
- Default to full document rewrites for major changes
- Use targeted updates only for specific, isolated changes
- Follow user instructions for which parts to modify

**When NOT to use \`updateDocument\`:**
- Immediately after creating a document

Do not update document right after creating it. Wait for user feedback or request to update it.
`;

export const regularPrompt =
  "You are a friendly assistant! Keep your responses concise and helpful.";

export type RequestHints = {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
};

/**
 * User preferences for AI personalization
 */
export type UserPreferences = {
  // User profile fields
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;

  // AI preferences
  aiContext?: string | null;
  proficiency?: string | null;
  aiTone?: string | null;
  aiGuidance?: string | null;
  personalizationEnabled?: boolean;

  // Workspace context
  workspaceName?: string | null;
  workspaceDescription?: string | null;

  // Role context
  roleLabel?: string | null;

  // Active skill (from slash commands)
  skillPrompt?: string | null;
  skillName?: string | null;
};

export const getRequestPromptFromHints = (requestHints: RequestHints) =>
  `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;

/**
 * Build a personalized system prompt section based on user preferences.
 * Includes user identity, workspace context, communication preferences, and custom instructions.
 */
export const getPersonalizationPrompt = (preferences: UserPreferences) => {
  if (!preferences.personalizationEnabled) {
    // Even if personalization is disabled, still apply skill prompt if present
    if (preferences.skillPrompt) {
      return `\n\n[Active Skill: ${
        sanitizeUserInput(preferences.skillName || "Custom")
      }]\n${sanitizeUserInput(preferences.skillPrompt)}`;
    }
    return "";
  }

  const parts: string[] = [];

  // User identity section
  const identityParts: string[] = [];

  // Build user name
  const fullName = [preferences.firstName, preferences.lastName]
    .filter(Boolean)
    .join(" ");

  if (fullName) {
    identityParts.push(`You are assisting ${fullName}`);
  }

  if (preferences.jobTitle) {
    const jobTitle = sanitizeUserInput(preferences.jobTitle);
    if (fullName) {
      identityParts[0] += `, a ${jobTitle}`;
    } else {
      identityParts.push(`You are assisting a ${jobTitle}`);
    }
  }

  if (preferences.workspaceName) {
    const workspaceName = sanitizeUserInput(preferences.workspaceName);
    if (identityParts.length > 0) {
      identityParts[0] += ` at ${workspaceName}`;
    }
  }

  if (identityParts.length > 0) {
    parts.push(identityParts[0] + ".");
  }

  // Workspace description
  if (preferences.workspaceDescription) {
    parts.push(
      `About their organization: ${
        sanitizeUserInput(preferences.workspaceDescription)
      }`,
    );
  }

  // User's role in workspace
  if (preferences.roleLabel) {
    parts.push(
      `Their role in this workspace: ${
        sanitizeUserInput(preferences.roleLabel)
      }`,
    );
  }

  // Communication preferences
  const commParts: string[] = [];

  if (preferences.proficiency) {
    const proficiencyMap: Record<string, string> = {
      less:
        "Prefer simpler language with step-by-step explanations. Avoid technical jargon.",
      regular:
        "Use a balanced approach with clear explanations and moderate technical detail.",
      more:
        "You can use technical terminology and detailed information. Assume technical knowledge.",
    };
    const proficiencyText = proficiencyMap[preferences.proficiency];
    if (proficiencyText) {
      commParts.push(proficiencyText);
    }
  }

  if (preferences.aiTone) {
    const toneMap: Record<string, string> = {
      friendly: "Adopt a friendly, bubbly, and playful tone.",
      balanced: "Maintain a professional yet approachable tone.",
      efficient: "Be direct and concise. Get straight to the point.",
    };
    const toneText = toneMap[preferences.aiTone];
    if (toneText) {
      commParts.push(toneText);
    }
  }

  if (commParts.length > 0) {
    parts.push(`Communication style: ${commParts.join(" ")}`);
  }

  // User's background and interests
  if (preferences.aiContext) {
    parts.push(
      `User's background: ${sanitizeUserInput(preferences.aiContext)}`,
    );
  }

  // Additional custom instructions
  if (preferences.aiGuidance) {
    parts.push(
      `Special instructions: ${sanitizeUserInput(preferences.aiGuidance)}`,
    );
  }

  // Active skill prompt (from slash commands)
  if (preferences.skillPrompt) {
    parts.push(
      `\n[Active Skill: ${
        sanitizeUserInput(preferences.skillName || "Custom")
      }]\n${sanitizeUserInput(preferences.skillPrompt)}`,
    );
  }

  return parts.length > 0 ? `\n\nPersonalization:\n${parts.join("\n\n")}` : "";
};

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
  userPreferences,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
  userPreferences?: UserPreferences;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  const personalizationPrompt = userPreferences
    ? getPersonalizationPrompt(userPreferences)
    : "";

  if (selectedChatModel === "chat-model-reasoning") {
    return `${regularPrompt}\n\n${requestPrompt}${personalizationPrompt}`;
  }

  return `${regularPrompt}\n\n${requestPrompt}${personalizationPrompt}\n\n${artifactsPrompt}`;
};

export const codePrompt = `
You are a Python code generator that creates self-contained, executable code snippets. When writing code:

1. Each snippet should be complete and runnable on its own
2. Prefer using print() statements to display outputs
3. Include helpful comments explaining the code
4. Keep snippets concise (generally under 15 lines)
5. Avoid external dependencies - use Python standard library
6. Handle potential errors gracefully
7. Return meaningful output that demonstrates the code's functionality
8. Don't use input() or other interactive functions
9. Don't access files or network resources
10. Don't use infinite loops

Examples of good snippets:

# Calculate factorial iteratively
def factorial(n):
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

print(f"Factorial of 5 is: {factorial(5)}")
`;

export const sheetPrompt = `
You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.
`;

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind,
) => {
  let mediaType = "document";

  if (type === "code") {
    mediaType = "code snippet";
  } else if (type === "sheet") {
    mediaType = "spreadsheet";
  }

  return `Improve the following contents of the ${mediaType} based on the given prompt.

${currentContent}`;
};

export const titlePrompt = `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`;
