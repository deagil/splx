import { z } from "zod";

/**
 * UI Schema for AI Skills Training System
 * 
 * Defines the structure of UI components that can be dynamically generated
 * by the AI during skill creation and refinement flows.
 */

export const skillOptionSchema = z.object({
  label: z.string().describe("Display label for the option"),
  value: z.string().describe("Value to send when option is selected"),
});

export const skillDataSchema = z.object({
  slug: z.string().describe("URL-safe skill command identifier"),
  prompt: z.string().describe("The skill prompt text (max 280 chars)"),
  name: z.string().describe("Short skill name (max 20 chars)"),
  description: z.string().describe("Short skill description (max 100 chars)"),
});

export const skillUISchema = z.object({
  type: z.enum(["question", "variants", "final-skill", "clarification"]).describe(
    "Type of UI component to render"
  ),
  message: z.string().describe("Message or question to display to the user"),
  options: z.array(skillOptionSchema).optional().describe(
    "Available options for selection (for question/variants types)"
  ),
  skill: skillDataSchema.optional().describe(
    "Complete skill definition (for final-skill type)"
  ),
});

export type SkillUI = z.infer<typeof skillUISchema>;
export type SkillOption = z.infer<typeof skillOptionSchema>;
export type SkillData = z.infer<typeof skillDataSchema>;


