"use client";

/**
 * A miniature of an email, rendered with the real block renderer at a CSS scale.
 *
 * Reusing `BlockContent` rather than drawing a fake wireframe means a starter's
 * thumbnail is always exactly what you get, for free — a new block type shows up
 * here the moment it renders anywhere else.
 */

import { emailBodyStyle, emailContainerStyle } from "@/lib/comms/block-styles";
import { resolveSampleValues } from "@/lib/comms/sample-values";
import type { EmailBlock, EmailTemplateVariable } from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import { BlockContent } from "./canvas/block-content";

const SCALE = 0.32;

export function TemplateThumbnail({
  blocks,
  className,
  variables = [],
}: {
  blocks: EmailBlock[];
  className?: string;
  variables?: EmailTemplateVariable[];
}) {
  const values = resolveSampleValues(variables, null);

  return (
    <div
      className={cn(
        "pointer-events-none relative overflow-hidden rounded-md border border-border",
        className
      )}
      style={{ backgroundColor: emailBodyStyle.backgroundColor }}
    >
      <div
        aria-hidden="true"
        style={{
          ...emailBodyStyle,
          // Scale a full-width email down rather than rendering a narrow one, so
          // proportions match the real thing instead of reflowing.
          height: `${100 / SCALE}%`,
          left: 0,
          position: "absolute",
          top: 0,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
          width: `${100 / SCALE}%`,
        }}
      >
        <div style={{ ...emailContainerStyle, maxWidth: "560px" }}>
          {blocks.map((block) => (
            <BlockContent
              block={block}
              key={block.id}
              mode="static"
              values={values}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
