import { NextResponse } from "next/server";
import { streamText, tool } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { myProvider } from "@/lib/ai/providers";
import { type SkillUI, skillUISchema } from "@/lib/ai/skills-ui-schema";

const SKILL_GENERATION_SYSTEM_PROMPT =
  `You convert a user's intent into a reusable skill.

You support three modes: clarification, initial creation, and refinement.

INPUT:
• user_intent: A free-text description of what the user wants the skill to accomplish.
• mode: "auto", "create", or "refine".
• previous_skill (optional): In refinement mode, the existing skill definition.

MODE LOGIC

If mode = "auto":
  1. Determine if user_intent is clear enough to create a skill.
  2. If unclear, output a clarification request.
  3. If clear, create the skill.

If mode = "create":
  Always generate the skill configuration.

If mode = "refine":
  Ask a single high-impact question OR offer 2–3 improved variants.
  Then produce an updated skill proposal.

CLARIFICATION CRITERIA

User intent is unclear when:
• The goal is ambiguous or multi-purpose.
• Constraints are missing (format, scope, tone, output structure).
• The description contains unstable context (e.g., "do it like last time").
• The action cannot be turned into a single reusable instruction.

SKILL CREATION SPECIFICATION

When creating a skill:
• Slug uses a–z, 0–9, hyphens, underscores only.
• Prompt must not reference the user's description; convert it into a general reusable instruction.
• Prompt should be no more than 280 characters.
• Name should be no more than 20 characters.
• Description should be no more than 100 characters.
• No meta-explanations or commentary.

REFINEMENT MODE SPECIFICATION

When mode = "refine":
• Increase clarity.
• Increase determinism and output consistency.
• Remove ambiguity.
• Ensure prompt is reusable, short, and purpose-specific.
• Offer 2-3 variants with different styles/tones/specificity levels.

Always use the ui tool to emit UI instructions. Return strict JSON matching the UI schema structure.`;

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
    const {
      description,
      mode = "auto",
      previous_skill,
      conversation_history = [],
    } = body;

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

    // Build conversation messages
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...conversation_history,
      {
        role: "user" as const,
        content: mode === "refine" && previous_skill
          ? `Refine this skill:\n\nPrevious skill: ${
            JSON.stringify(previous_skill)
          }\n\nUser's original intent: "${description.trim()}"`
          : `Convert this user description into a skill (mode: ${mode}):\n\n"${description.trim()}"`,
      },
    ];

    // Create UI tool that emits UI instructions
    const uiTool = tool({
      description:
        "Emit UI state for the skill creation workflow. Use this to show questions, variants, or final skill to the user.",
      inputSchema: skillUISchema,
      execute: async (params) => {
        // The tool execution just returns the params - the UI will be rendered
        // based on the tool call in the GenerativeUI component
        return params;
      },
    });

    const result = streamText({
      model: myProvider.languageModel("chat-model"),
      system: SKILL_GENERATION_SYSTEM_PROMPT,
      messages,
      tools: {
        ui: uiTool,
      },
    });

    // Create a readable stream that processes tool calls and emits custom events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Process the full stream to detect tool calls
          for await (const chunk of result.fullStream) {
            // Check for tool-call chunks
            if (
              chunk.type === "tool-call" && "toolName" in chunk &&
              chunk.toolName === "ui"
            ) {
              let uiState: SkillUI | undefined;

              // Try to extract UI state from input property
              if (
                "input" in chunk && typeof chunk.input === "object" &&
                chunk.input !== null
              ) {
                uiState = chunk.input as SkillUI;
              }

              if (
                uiState && "type" in uiState && typeof uiState.type === "string"
              ) {
                // Emit custom data event
                const data = JSON.stringify({
                  type: "skill-ui",
                  data: uiState,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }

            // Check for tool-result chunks
            if (chunk.type === "tool-result" && "toolCallId" in chunk) {
              let uiState: SkillUI | undefined;

              // Try to extract UI state from output property
              if (
                "output" in chunk && typeof chunk.output === "object" &&
                chunk.output !== null
              ) {
                uiState = chunk.output as SkillUI;
              }

              if (
                uiState && "type" in uiState && typeof uiState.type === "string"
              ) {
                // Emit custom data event
                const data = JSON.stringify({
                  type: "skill-ui",
                  data: uiState,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error("Error processing skill generation stream:", error);
          const errorData = JSON.stringify({
            type: "error",
            error: "Failed to process skill generation",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating skill:", error);
    return NextResponse.json(
      { error: "Failed to generate skill. Please try again." },
      { status: 500 },
    );
  }
}
