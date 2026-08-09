"use client";

/**
 * Renders one `EmailBlock` as plain DOM, using the exact style objects the
 * server renderer feeds to React Email (`lib/comms/block-styles.ts`).
 *
 * Governing rule: this component may not use a Tailwind class that affects
 * layout. The canvas lives inside the app's Tailwind cascade and the email does
 * not, so anything that moves a pixel has to be an inline style from the shared
 * module. Selection rings, handles and toolbars live in `block-chrome.tsx`,
 * outside the styled subtree.
 *
 * Three modes:
 * - editable  — text fields are `TokenField`s showing chips
 * - preview   — tokens merged against sample values, read-only
 * - static    — same as preview but stripped down for drag overlays/thumbnails
 */

import {
  emailButtonInnerStyle,
  emailButtonSectionStyle,
  emailButtonStyle,
  emailDividerStyle,
  emailFooterStyle,
  emailHeaderLogoStyle,
  emailHeaderSectionStyle,
  emailHeaderTitleStyle,
  emailHeadingStyle,
  emailImageSectionStyle,
  emailImageStyle,
  emailSpacerStyle,
  emailTextStyle,
  HEADING_TAG_BY_LEVEL,
} from "@/lib/comms/block-styles";
import { mergeEmailString } from "@/lib/comms/merge";
import type { EmailBlock, EmailTemplateVariable } from "@/lib/comms/types";
import { TokenField } from "../token-field/token-field";

export interface BlockContentProps {
  block: EmailBlock;
  mode: "editable" | "preview" | "static";
  onChange?: (patch: Partial<EmailBlock>) => void;
  onCreateVariable?: (
    draftKey: string
  ) => Promise<EmailTemplateVariable | null>;
  /** Merge values used by the `preview` and `static` modes. */
  values?: Record<string, unknown>;
  variables?: EmailTemplateVariable[];
}

/** Placeholder shown for an empty image/logo so the block stays clickable. */
function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: "#f3f4f6",
        border: "1px dashed #d1d5db",
        borderRadius: "4px",
        color: "#9ca3af",
        display: "flex",
        fontSize: "12px",
        justifyContent: "center",
        minHeight: "80px",
      }}
    >
      {label}
    </div>
  );
}

export function BlockContent({
  block,
  mode,
  onChange,
  onCreateVariable,
  values = {},
  variables = [],
}: BlockContentProps) {
  const editable = mode === "editable";

  const text = (raw: string) =>
    editable ? raw : mergeEmailString(raw, values);

  const field = (
    raw: string,
    patchKey: string,
    options: {
      ariaLabel: string;
      multiline?: boolean;
      placeholder?: string;
      style: React.CSSProperties;
    }
  ) => {
    if (!editable) {
      return <span style={options.style}>{text(raw)}</span>;
    }
    return (
      <TokenField
        aria-label={options.ariaLabel}
        multiline={options.multiline}
        onChange={(next) =>
          onChange?.({ [patchKey]: next } as Partial<EmailBlock>)
        }
        onCreateVariable={onCreateVariable}
        placeholder={options.placeholder}
        style={options.style}
        value={raw}
        variables={variables}
        variant="inline"
      />
    );
  };

  switch (block.type) {
    case "header":
      return (
        <div style={emailHeaderSectionStyle}>
          {block.logoUrl ? (
            // biome-ignore lint/performance/noImgElement: must be the same plain <img> the email uses, not Next's optimizer
            // biome-ignore lint/correctness/useImageSize: dimensions come from the shared email styles, not HTML attributes
            <img
              alt={mergeEmailString(block.title ?? "Logo", values)}
              src={mergeEmailString(block.logoUrl, values)}
              style={emailHeaderLogoStyle}
            />
          ) : null}
          {field(block.title ?? "", "title", {
            ariaLabel: "Header title",
            placeholder: "Product name",
            style: emailHeaderTitleStyle,
          })}
        </div>
      );

    case "heading": {
      const level = block.level ?? 1;
      const Tag = HEADING_TAG_BY_LEVEL[level];
      return (
        <Tag style={emailHeadingStyle(level)}>
          {field(block.text, "text", {
            ariaLabel: "Heading text",
            placeholder: "Heading",
            style: { display: "block" },
          })}
        </Tag>
      );
    }

    case "text":
      return (
        <div style={emailTextStyle}>
          {field(block.text, "text", {
            ariaLabel: "Body text",
            multiline: true,
            placeholder: "Write your message…",
            style: { display: "block" },
          })}
        </div>
      );

    case "button":
      return (
        <div style={emailButtonSectionStyle}>
          {/* Two elements, matching React Email's <Button>: without the inner
              span the button is a pixel short and its baseline shifts. */}
          <span style={emailButtonStyle}>
            <span style={emailButtonInnerStyle}>
              {field(block.label, "label", {
                ariaLabel: "Button label",
                placeholder: "Button",
                style: { display: "inline-block" },
              })}
            </span>
          </span>
        </div>
      );

    case "image":
      return (
        <div style={emailImageSectionStyle}>
          {block.src ? (
            // biome-ignore lint/performance/noImgElement: must be the same plain <img> the email uses, not Next's optimizer
            // biome-ignore lint/correctness/useImageSize: dimensions come from the shared email styles, not HTML attributes
            <img
              alt={mergeEmailString(block.alt ?? "", values)}
              src={mergeEmailString(block.src, values)}
              style={emailImageStyle(block.width)}
            />
          ) : (
            <ImagePlaceholder label="No image URL set" />
          )}
        </div>
      );

    case "divider":
      return <hr style={emailDividerStyle} />;

    case "spacer":
      return (
        <div style={emailSpacerStyle(block.height)}>
          {editable ? (
            <div
              style={{
                borderTop: "1px dashed #d1d5db",
                height: "100%",
                opacity: 0.5,
              }}
            />
          ) : null}
        </div>
      );

    case "footer":
      return (
        <div style={emailFooterStyle}>
          {field(block.text, "text", {
            ariaLabel: "Footer text",
            multiline: true,
            placeholder: "Footer note",
            style: { display: "block" },
          })}
        </div>
      );

    default: {
      const _exhaustive: never = block;
      throw new Error(`Unknown block type: ${String(_exhaustive)}`);
    }
  }
}
