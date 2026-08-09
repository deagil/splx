import { describe, expect, it } from "vitest";
import {
  emailBodyStyle,
  emailButtonInnerStyle,
  emailButtonSectionStyle,
  emailButtonStyle,
  emailContainerStyle,
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
} from "@/lib/comms/block-styles";
import type { EmailBlock } from "@/lib/comms/types";
import { renderEmailTemplate } from "./render";

/**
 * The editable canvas (`components/comms/canvas/*`) re-renders these same style
 * objects in the browser, so a change here is a change to both renderers. The
 * snapshot exists to make that unmistakable in review — if you meant it, update
 * the snapshot and eyeball the canvas against the true preview.
 */
describe("email block styles", () => {
  it("matches the shared snapshot", () => {
    expect({
      body: emailBodyStyle,
      button: emailButtonStyle,
      buttonInner: emailButtonInnerStyle,
      buttonSection: emailButtonSectionStyle,
      container: emailContainerStyle,
      divider: emailDividerStyle,
      footer: emailFooterStyle,
      headerLogo: emailHeaderLogoStyle,
      headerSection: emailHeaderSectionStyle,
      headerTitle: emailHeaderTitleStyle,
      heading1: emailHeadingStyle(1),
      heading2: emailHeadingStyle(2),
      heading3: emailHeadingStyle(3),
      image: emailImageStyle(320),
      imageFluid: emailImageStyle(),
      imageSection: emailImageSectionStyle,
      spacer: emailSpacerStyle(24),
      text: emailTextStyle,
    }).toMatchSnapshot();
  });

  it("keeps the margin shorthand on text-like blocks", () => {
    // React Email's <Text> injects its own marginTop/marginBottom when those
    // longhands are undefined. The shorthand suppresses that; splitting it would
    // add a phantom 16px top margin the canvas does not have.
    expect(emailTextStyle.margin).toBe("0 0 16px");
    expect(emailFooterStyle.margin).toBe("24px 0 0");
    expect(emailHeadingStyle(1).margin).toBe("0 0 16px");
  });
});

const ALL_BLOCKS: EmailBlock[] = [
  {
    id: "b-header",
    logoUrl: "https://cdn.test/logo.png",
    title: "Acme",
    type: "header",
  },
  { id: "b-h1", level: 1, text: "Heading one", type: "heading" },
  { id: "b-h2", level: 2, text: "Heading two", type: "heading" },
  { id: "b-h3", level: 3, text: "Heading three", type: "heading" },
  { id: "b-text", text: "Line one\nLine two", type: "text" },
  { id: "b-button", label: "Open", type: "button", url: "https://example.com" },
  {
    alt: "Shot",
    id: "b-image",
    src: "https://cdn.test/a.png",
    type: "image",
    width: 320,
  },
  { id: "b-divider", type: "divider" },
  { height: 24, id: "b-spacer", type: "spacer" },
  { id: "b-footer", text: "Unsubscribe", type: "footer" },
];

describe("renderEmailTemplate", () => {
  it("renders every block type with the shared styles", async () => {
    const { html, text } = await renderEmailTemplate({
      blocks: ALL_BLOCKS,
      previewText: "Preview line",
      subject: "Subject",
      values: {},
    });

    // Sizes must differ per level — the canvas exposes `level` as a control, so
    // rendering all three at 24px would make that control look broken.
    expect(html).toContain("font-size:24px");
    expect(html).toContain("font-size:20px");
    expect(html).toContain("font-size:17px");

    // The two-element button structure the canvas mirrors.
    expect(html).toContain("line-height:100%");
    expect(html).toContain("line-height:120%");

    // Explicit <hr> margin, since Tailwind preflight zeroes the UA default.
    expect(html).toContain("margin:8px 0");

    expect(text).toContain("Open: https://example.com");
    expect(text).toContain("Line one\nLine two");
  });

  it("leaves undeclared tokens visible rather than blanking them", async () => {
    const { html, subject } = await renderEmailTemplate({
      blocks: [{ id: "b1", text: "Hi {{unknown.key}}", type: "text" }],
      subject: "Hi {{unknown.key}}",
      values: {},
    });

    expect(subject).toBe("Hi {{unknown.key}}");
    expect(html).toContain("{{unknown.key}}");
  });
});
