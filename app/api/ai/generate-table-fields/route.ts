import { NextResponse } from "next/server";
import { streamObject } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { handleError } from "@/server/api/responses";

export async function POST(request: Request) {
  try {
    // Unauthenticated LLM invocation until now: anyone who could reach this
    // route could burn tokens against the workspace's provider budget.
    // Streaming, so deliberately not wrapped in endpoint() — auth and
    // permission only. See docs/API_CONTROL_PLANE.md.
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "tables.edit");

    const { description, type } = await request.json();

    if (!description || type !== "fields") {
      return NextResponse.json(
        { error: "Description and type are required" },
        { status: 400 }
      );
    }

    const { object } = await streamObject({
      model: myProvider.languageModel("artifact-model"),
      system: `You are a database schema expert. Generate appropriate database fields/columns for a table based on the user's description. 
      Return an array of field objects with: field_name (snake_case), display_name, data_type (text, integer, uuid, boolean, timestamp, date, numeric, json, jsonb), 
      is_required (boolean), is_unique (boolean), and optional description. Always include an 'id' field of type 'uuid' as the primary key.`,
      prompt: `Generate database fields for a table with this description: ${description}`,
      schema: z.object({
        fields: z.array(
          z.object({
            field_name: z.string(),
            display_name: z.string().optional(),
            data_type: z.string(),
            is_required: z.boolean().optional(),
            is_unique: z.boolean().optional(),
            description: z.string().optional(),
            default_value: z.unknown().optional(),
          })
        ),
      }),
    });

    const result = await object;
    return NextResponse.json({ fields: result.fields });
  } catch (error) {
    // Shared mapping so Unauthorized -> 401 and Forbidden -> 403 rather than
    // both collapsing into 500.
    return handleError(error);
  }
}

