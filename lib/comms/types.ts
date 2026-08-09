/**
 * Shared Comms email template types (blocks + declared merge variables).
 * Stored as JSONB on email_templates; rendered via React Email.
 */

export const EMAIL_VARIABLE_TYPES = [
  "string",
  "number",
  "boolean",
  "date",
  "email",
  "url",
] as const;

export type EmailVariableType = (typeof EMAIL_VARIABLE_TYPES)[number];

export interface EmailTemplateVariable {
  description?: string;
  key: string;
  label: string;
  required: boolean;
  type: EmailVariableType;
}

export type EmailTemplateStatus = "draft" | "active";

export interface EmailHeaderBlock {
  id: string;
  logoUrl?: string;
  title?: string;
  type: "header";
}

export interface EmailHeadingBlock {
  id: string;
  level?: 1 | 2 | 3;
  text: string;
  type: "heading";
}

export interface EmailTextBlock {
  id: string;
  text: string;
  type: "text";
}

export interface EmailButtonBlock {
  id: string;
  label: string;
  type: "button";
  url: string;
}

export interface EmailImageBlock {
  alt?: string;
  id: string;
  src: string;
  type: "image";
  width?: number;
}

export interface EmailDividerBlock {
  id: string;
  type: "divider";
}

export interface EmailSpacerBlock {
  height?: number;
  id: string;
  type: "spacer";
}

export interface EmailFooterBlock {
  id: string;
  text: string;
  type: "footer";
}

export type EmailBlock =
  | EmailHeaderBlock
  | EmailHeadingBlock
  | EmailTextBlock
  | EmailButtonBlock
  | EmailImageBlock
  | EmailDividerBlock
  | EmailSpacerBlock
  | EmailFooterBlock;

export type EmailBlockType = EmailBlock["type"];

export const EMAIL_BLOCK_TYPES = [
  "header",
  "heading",
  "text",
  "button",
  "image",
  "divider",
  "spacer",
  "footer",
] as const satisfies readonly EmailBlockType[];
