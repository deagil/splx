import { Heading, Img, Section, Text } from "@react-email/components";
import type { ContentBlock } from "@/lib/types/releases";

interface EmailContentBlockProps {
  baseUrl?: string;
  block: ContentBlock;
}

const textStyles = {
  lead: {
    color: "#1a1a1a",
    fontSize: "18px",
    lineHeight: "28px",
    margin: "0 0 24px 0",
  },
  muted: {
    color: "#6b7280",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 24px 0",
  },
  paragraph: {
    color: "#1a1a1a",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 24px 0",
  },
};

const headingStyles = {
  2: {
    color: "#1a1a1a",
    fontSize: "28px",
    fontWeight: "600" as const,
    lineHeight: "36px",
    margin: "32px 0 16px 0",
    textAlign: "center" as const,
  },
  3: {
    color: "#1a1a1a",
    fontSize: "22px",
    fontWeight: "600" as const,
    lineHeight: "30px",
    margin: "24px 0 12px 0",
  },
};

export function EmailContentBlock({
  block,
  baseUrl = "https://suplex.studio",
}: EmailContentBlockProps) {
  switch (block.type) {
    case "text":
      return (
        <Text style={textStyles[block.variant ?? "paragraph"]}>
          {block.content}
        </Text>
      );

    case "heading":
      return (
        <Heading as={`h${block.level}`} style={headingStyles[block.level]}>
          {block.content}
        </Heading>
      );

    case "list":
      return (
        <Section style={{ margin: "0 0 24px 0" }}>
          {block.items.map((item, index) => (
            <Text
              key={index}
              style={{
                color: "#6b7280",
                fontSize: "16px",
                lineHeight: "26px",
                margin: "0 0 12px 0",
                paddingLeft: "20px",
              }}
            >
              • {item}
            </Text>
          ))}
        </Section>
      );

    case "media": {
      // Make sure image URLs are absolute
      const imageSrc = block.src.startsWith("http")
        ? block.src
        : `${baseUrl}${block.src}`;

      return (
        <Section style={{ margin: "32px 0", textAlign: "center" as const }}>
          <Img
            alt={block.alt ?? ""}
            src={imageSrc}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              maxWidth: "600px",
            }}
            width="100%"
          />
          {!!block.caption && (
            <Text
              style={{
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: "20px",
                margin: "12px 0 0 0",
                textAlign: "center" as const,
              }}
            >
              {block.caption}
            </Text>
          )}
        </Section>
      );
    }

    default:
      return null;
  }
}

export function EmailContentBlocks({
  sections,
  baseUrl,
}: {
  sections: ContentBlock[];
  baseUrl?: string;
}) {
  return (
    <>
      {sections.map((block, index) => (
        <EmailContentBlock baseUrl={baseUrl} block={block} key={index} />
      ))}
    </>
  );
}
