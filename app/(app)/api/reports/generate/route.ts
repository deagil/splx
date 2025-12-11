import { NextResponse } from "next/server";
import { streamText, tool } from "ai";
import { ZodError } from "zod";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { listTableConfigs } from "@/lib/server/tables";
import { myProvider } from "@/lib/ai/providers";
import { type ReportUI, reportUISchema } from "@/lib/ai/reports-ui-schema";

const REPORT_SYSTEM_PROMPT =
  `You are a reporting assistant that converts a user's analytics intent into a safe, read-only SQL query and chart configuration.

Capabilities:
- Ask clarifying questions when the intent is ambiguous.
- Offer 2-3 concise variants when trade-offs exist (e.g., grouping vs. filtering).
- Produce a final "report" payload containing: title, description, SQL, recommended chart type, and chart config hints.

SQL requirements:
- Read-only: SELECT statements only. Do NOT use INSERT/UPDATE/DELETE/DDL.
- Return small, chart-ready datasets (<= 500 rows). Include LIMIT.
- Prefer ISO timestamps; alias columns to human-friendly names.
- Never interpolate unsanitized user input; avoid string concatenation.
- Assume Postgres dialect.

Chart guidance:
- Recommend a chart type (bar/line/area/pie/metric/table) based on the data.
- Provide a chart_config object with:
  - xKey and yKey to indicate the primary category/metric columns.
  - labels: human-friendly labels for keys (x, y, and any series keys).
  - colors: harmonious palette for each series key (hex values, readable in light/dark).
  - series: optional list of { key, label, color } when multiple metrics are present.
  - Keep the config compact and deterministic so it can be saved with the report.
  - Prefer 4–6 distinct colors using evenly spaced hues (HSL/hex), default to cool tones.

Workspace context is provided below as JSON for available tables/columns. Use it to ground SQL.\n`;
// Critical: always return UI via the ui tool on every turn (question, variants, clarification, or final-report). Do not respond without calling the ui tool.`;

function buildTableContext(
  tables: Array<{ id: string; name: string; columns?: string[] }>,
) {
  if (!tables.length) {
    return "No table metadata available.";
  }

  const trimmed = tables.slice(0, 20);
  return JSON.stringify(
    trimmed.map((table) => ({
      id: table.id,
      name: table.name,
      columns: table.columns ?? [],
    })),
    null,
    2,
  );
}

type ConversationMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "tables.edit");

    const body = await request.json();
    const {
      description,
      mode = "auto",
      previous_report,
      conversation_history = [],
    } = body as {
      description?: string;
      mode?: "auto" | "create" | "refine";
      previous_report?: unknown;
      conversation_history?: ConversationMessage[];
    };

    if (
      !description || typeof description !== "string" ||
      description.trim().length === 0
    ) {
      return NextResponse.json({ error: "Description is required" }, {
        status: 400,
      });
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or less" },
        { status: 400 },
      );
    }

    const tableConfigs = await listTableConfigs(tenant);
    const tableContext = buildTableContext(
      tableConfigs.map((t) => ({
        id: t.id,
        name: t.name,
        columns: t.config?.field_metadata?.map((f) => f.field_name) ?? [],
      })),
    );

    const messages: ConversationMessage[] = [
      ...conversation_history,
      {
        role: "user",
        content: mode === "refine" && previous_report
          ? `Refine this report definition.\nPrevious report: ${
            JSON.stringify(
              previous_report,
            )
          }\nUser intent: "${description.trim()}"`
          : `Create a report for intent: "${description.trim()}".`,
      },
    ];

    const uiTool = tool({
      description:
        "Emit UI state for the report creation workflow (question, variants, clarification, final-report).",
      inputSchema: reportUISchema,
      execute: async (params) => params,
    });

    const result = streamText({
      model: myProvider.languageModel("chat-model"),
      system: `${REPORT_SYSTEM_PROMPT}\nTable context:\n${tableContext}`,
      messages,
      tools: {
        ui: uiTool,
      },
      toolChoice: { type: "tool", toolName: "ui" },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const chunk of result.fullStream) {
            if (
              chunk.type === "tool-call" && "toolName" in chunk &&
              chunk.toolName === "ui"
            ) {
              let uiState: ReportUI | undefined;
              if (
                "input" in chunk && typeof chunk.input === "object" &&
                chunk.input !== null
              ) {
                uiState = chunk.input as ReportUI;
              }

              if (uiState && uiState.type) {
                const data = JSON.stringify({
                  type: "report-ui",
                  data: uiState,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }

            if (chunk.type === "tool-result" && "toolCallId" in chunk) {
              let uiState: ReportUI | undefined;
              if (
                "output" in chunk && typeof chunk.output === "object" &&
                chunk.output !== null
              ) {
                uiState = chunk.output as ReportUI;
              }

              if (uiState && uiState.type) {
                const data = JSON.stringify({
                  type: "report-ui",
                  data: uiState,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
          }

          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({
            type: "error",
            error: error instanceof Error
              ? error.message
              : "Failed to process report generation",
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}



