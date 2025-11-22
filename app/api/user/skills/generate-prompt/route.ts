import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { myProvider } from "@/lib/ai/providers";

const PROMPT_GENERATION_SYSTEM_PROMPT =
  `You are a prompt engineering assistant. Your task is to convert a user's plain text description of what they want to accomplish into a high-quality skill configuration.

Generate:
1. A slash command slug: A short, URL-safe identifier using lowercase letters, numbers, hyphens, and underscores only (e.g., "summarize-webpage", "code-review"). This will be used as a slash command like /summarize-webpage.
2. A high-quality prompt: A short, clear, specific, and actionable prompt that can be used in an AI chat interface. The prompt should work well as a standalone prompt that can be inserted into a chat conversation. The prompt should be no more than 280 characters.
3. A name: A short, descriptive label that can be used to identify the skill. The label should be no more than 20 characters.
4. A description: A short, descriptive description that can be used to identify the skill. The description should be no more than 100 characters. 
`;
const skillGenerationSchema = z.object({
  command: z.string().describe(
    "URL-safe skill name for slash command (lowercase, hyphens, underscores only)",
  ),
  prompt: z.string().describe("High-quality prompt text for the skill"),
  name: z.string().describe("Short, descriptive label for the skill"),
  description: z.string().describe(
    "Short, descriptive description for the skill",
  ),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { description } = body;

    if (
      !description || typeof description !== "string" ||
      description.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or less" },
        { status: 400 },
      );
    }

    const { object } = await generateObject({
      model: myProvider.languageModel("chat-model"),
      system: PROMPT_GENERATION_SYSTEM_PROMPT,
      prompt:
        `Convert this user description into a skill:\n\n"${description.trim()}"`,
      schema: skillGenerationSchema,
    });

    // Validate and sanitize the generated name
    const sanitizedName = object.command
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!sanitizedName || sanitizedName.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate valid skill command" },
        { status: 500 },
      );
    }

    if (!object.prompt || object.prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Failed to generate prompt" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      command: sanitizedName,
      prompt: object.prompt.trim(),
      name: object.name.trim(),
      description: object.description.trim(),
    });
  } catch (error) {
    console.error("Error generating skill:", error);
    return NextResponse.json(
      { error: "Failed to generate skill. Please try again." },
      { status: 500 },
    );
  }
}
