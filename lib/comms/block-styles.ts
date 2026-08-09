/**
 * Inline styles shared by the two email renderers:
 *
 * - `server/comms/render.tsx` — React Email components, compiled to the HTML we
 *   actually deliver.
 * - `components/comms/canvas/*` — the editable canvas in the template editor.
 *
 * They must stay pixel-identical, so every style lives here and neither side is
 * allowed to reach for a Tailwind class that affects layout. The canvas renders
 * inside the app's Tailwind cascade (which zeroes UA margins and sets
 * `box-sizing: border-box` globally); the email does not. Anything the email
 * inherits from a UA stylesheet or from a React Email component default is
 * therefore spelled out explicitly below rather than left implicit.
 *
 * Framework-agnostic on purpose: no `@react-email/*` import, no `server-only`.
 */

import type { CSSProperties } from "react";

export const emailBodyStyle = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  margin: "0",
  padding: "0",
} satisfies CSSProperties;

export const emailContainerStyle = {
  backgroundColor: "#ffffff",
  // React Email's <Container> is a <table>, which is border-box; the canvas only
  // matches because Tailwind preflight sets it globally. Say it out loud.
  boxSizing: "border-box",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px 24px",
} satisfies CSSProperties;

const HEADING_FONT_SIZE_BY_LEVEL = {
  1: "24px",
  2: "20px",
  3: "17px",
} as const;

export const HEADING_TAG_BY_LEVEL = {
  1: "h1",
  2: "h2",
  3: "h3",
} as const;

export function emailHeadingStyle(level: 1 | 2 | 3 = 1): CSSProperties {
  return {
    color: "#111827",
    fontSize: HEADING_FONT_SIZE_BY_LEVEL[level],
    fontWeight: "600",
    lineHeight: "1.3",
    // Keep the `margin` shorthand. React Email's <Heading>/<Text> only inject
    // their own marginTop/marginBottom when those longhands are undefined, and
    // the shorthand resets their accumulator. Splitting this into marginBottom
    // would make the email grow a phantom 16px marginTop the canvas lacks.
    margin: "0 0 16px",
  };
}

export const emailTextStyle = {
  color: "#374151",
  fontSize: "15px",
  // Required on both sides: React Email's <Text> defaults to `line-height: 24px`
  // when this is omitted, which is not the same as 1.6 at 15px.
  lineHeight: "1.6",
  margin: "0 0 16px",
  whiteSpace: "pre-wrap",
} satisfies CSSProperties;

export const emailFooterStyle = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "24px 0 0",
  whiteSpace: "pre-wrap",
} satisfies CSSProperties;

/**
 * React Email's <Button> renders `<a style={...}><span style={...}>label</span></a>`
 * so that padding survives Outlook. The canvas renders the same two elements with
 * the same two styles — without the inner span the button is ~1px shorter and its
 * baseline sits differently.
 */
export const emailButtonStyle = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "100%",
  padding: "12px 20px",
  textDecoration: "none",
} satisfies CSSProperties;

export const emailButtonInnerStyle = {
  display: "inline-block",
  lineHeight: "120%",
  maxWidth: "100%",
} satisfies CSSProperties;

export const emailHeaderSectionStyle = {
  marginBottom: "24px",
} satisfies CSSProperties;

export const emailHeaderTitleStyle = {
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: "600",
  letterSpacing: "0.04em",
  margin: "0",
  textTransform: "uppercase",
} satisfies CSSProperties;

export const emailHeaderLogoStyle = {
  display: "block",
  // A `height="40"` attribute is overridden by Tailwind preflight's
  // `img { height: auto }` on the canvas. As a style it survives both.
  height: "40px",
  marginBottom: "8px",
  width: "auto",
} satisfies CSSProperties;

export const emailButtonSectionStyle = {
  margin: "24px 0",
} satisfies CSSProperties;

export const emailImageSectionStyle = {
  margin: "16px 0",
} satisfies CSSProperties;

export const emailDividerStyle = {
  border: "none",
  borderTop: "1px solid #e5e7eb",
  // UA stylesheets give <hr> `margin-block: 0.5em`; Tailwind preflight zeroes it.
  margin: "8px 0",
  width: "100%",
} satisfies CSSProperties;

export function emailImageStyle(width?: number): CSSProperties {
  return {
    display: "block",
    maxWidth: "100%",
    width: width ? `${width}px` : "100%",
  };
}

export function emailSpacerStyle(height?: number): CSSProperties {
  return { height: `${height ?? 16}px` };
}
