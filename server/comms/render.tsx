import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import {
  emailBodyStyle,
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
  HEADING_TAG_BY_LEVEL,
} from "@/lib/comms/block-styles";
import { mergeEmailString } from "@/lib/comms/merge";
import type { EmailBlock } from "@/lib/comms/types";

export interface RenderEmailInput {
  blocks: EmailBlock[];
  previewText?: string | null;
  subject: string;
  values: Record<string, unknown>;
}

export interface RenderedEmail {
  html: string;
  subject: string;
  text: string;
}

/**
 * Merged values are passed as React children and JSX attributes, so React does
 * the escaping. Never use `mergeAndEscape` here — it would escape a second time
 * and deliver `Acme &amp; Co` for `Acme & Co`.
 */
function BlockNodes({
  blocks,
  values,
}: {
  blocks: EmailBlock[];
  values: Record<string, unknown>;
}) {
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "header":
            return (
              <Section key={block.id} style={emailHeaderSectionStyle}>
                {block.logoUrl ? (
                  <Img
                    alt={mergeEmailString(block.title ?? "Logo", values)}
                    src={mergeEmailString(block.logoUrl, values)}
                    style={emailHeaderLogoStyle}
                  />
                ) : null}
                {block.title ? (
                  <Text style={emailHeaderTitleStyle}>
                    {mergeEmailString(block.title, values)}
                  </Text>
                ) : null}
              </Section>
            );
          case "heading": {
            const level = block.level ?? 1;
            return (
              <Heading
                as={HEADING_TAG_BY_LEVEL[level]}
                key={block.id}
                style={emailHeadingStyle(level)}
              >
                {mergeEmailString(block.text, values)}
              </Heading>
            );
          }
          case "text":
            return (
              <Text key={block.id} style={emailTextStyle}>
                {mergeEmailString(block.text, values)}
              </Text>
            );
          case "button":
            return (
              <Section key={block.id} style={emailButtonSectionStyle}>
                <Button
                  href={mergeEmailString(block.url, values)}
                  style={emailButtonStyle}
                >
                  {mergeEmailString(block.label, values)}
                </Button>
              </Section>
            );
          case "image":
            return (
              <Section key={block.id} style={emailImageSectionStyle}>
                <Img
                  alt={mergeEmailString(block.alt ?? "", values)}
                  src={mergeEmailString(block.src, values)}
                  style={emailImageStyle(block.width)}
                />
              </Section>
            );
          case "divider":
            return <Hr key={block.id} style={emailDividerStyle} />;
          case "spacer":
            return (
              <Section key={block.id} style={emailSpacerStyle(block.height)} />
            );
          case "footer":
            return (
              <Text key={block.id} style={emailFooterStyle}>
                {mergeEmailString(block.text, values)}
              </Text>
            );
          default: {
            const _exhaustive: never = block;
            throw new Error(`Unknown block type: ${String(_exhaustive)}`);
          }
        }
      })}
    </>
  );
}

function TemplateEmail({
  blocks,
  previewText,
  values,
}: {
  blocks: EmailBlock[];
  previewText?: string | null;
  values: Record<string, unknown>;
}) {
  const preview = previewText
    ? mergeEmailString(previewText, values)
    : undefined;

  return (
    <Html>
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Body style={emailBodyStyle}>
        <Container style={emailContainerStyle}>
          <BlockNodes blocks={blocks} values={values} />
        </Container>
      </Body>
    </Html>
  );
}

function blocksToPlainText(
  blocks: EmailBlock[],
  values: Record<string, unknown>
): string {
  const lines: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "header":
        if (block.title) {
          lines.push(mergeEmailString(block.title, values));
        }
        break;
      case "heading":
      case "text":
      case "footer":
        lines.push(mergeEmailString(block.text, values));
        break;
      case "button":
        lines.push(
          `${mergeEmailString(block.label, values)}: ${mergeEmailString(block.url, values)}`
        );
        break;
      case "image":
        lines.push(mergeEmailString(block.alt ?? block.src, values));
        break;
      case "divider":
        lines.push("---");
        break;
      case "spacer":
        lines.push("");
        break;
      default: {
        const _exhaustive: never = block;
        throw new Error(`Unknown block type: ${String(_exhaustive)}`);
      }
    }
  }
  return lines.join("\n\n");
}

export async function renderEmailTemplate(
  input: RenderEmailInput
): Promise<RenderedEmail> {
  const subject = mergeEmailString(input.subject, input.values);
  const element = TemplateEmail({
    blocks: input.blocks,
    previewText: input.previewText,
    values: input.values,
  });

  const [html, text] = await Promise.all([
    render(element),
    Promise.resolve(blocksToPlainText(input.blocks, input.values)),
  ]);

  return { html, subject, text };
}
