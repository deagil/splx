import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReleaseNote } from "@/lib/types/releases";
import { EmailContentBlocks } from "./email-content-block";

interface ReleaseNoteEmailProps {
  baseUrl?: string;
  release: ReleaseNote;
}

export function ReleaseNoteEmail({
  release,
  baseUrl = "https://suplex.studio",
}: ReleaseNoteEmailProps) {
  const previewText =
    release.emailPreviewText ?? `${release.title} - ${release.publicationName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={publicationNameStyle}>
              {release.publicationName ?? "What's New"}
            </Text>
            <Text style={issueInfoStyle}>
              Issue #{release.issueNumber} • {release.appVersion}
            </Text>
          </Section>

          {/* Title Section */}
          <Section style={titleSectionStyle}>
            <Heading as="h1" style={titleStyle}>
              {release.title}
            </Heading>
            {!!release.subtitle && (
              <Text style={subtitleStyle}>{release.subtitle}</Text>
            )}
          </Section>

          <Hr style={dividerStyle} />

          {/* Content Sections */}
          <Section style={contentSectionStyle}>
            <EmailContentBlocks baseUrl={baseUrl} sections={release.sections} />
          </Section>

          <Hr style={dividerStyle} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              You're receiving this email because you subscribed to Suplex
              Weekly.
            </Text>
            <Text style={footerLinksStyle}>
              <Link
                href={`${baseUrl}/whats-new/${release.slug}`}
                style={linkStyle}
              >
                View in browser
              </Link>
              {" • "}
              <Link href={`${baseUrl}/unsubscribe`} style={linkStyle}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={copyrightStyle}>
              © {new Date().getFullYear()} Suplex. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const bodyStyle = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: "0",
  padding: "40px 0",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden" as const,
};

const headerStyle = {
  padding: "32px 40px 16px",
  textAlign: "center" as const,
};

const publicationNameStyle = {
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: "600" as const,
  letterSpacing: "0.05em",
  margin: "0 0 8px 0",
  textTransform: "uppercase" as const,
};

const issueInfoStyle = {
  color: "#9ca3af",
  fontSize: "13px",
  margin: "0",
};

const titleSectionStyle = {
  padding: "16px 40px 24px",
  textAlign: "center" as const,
};

const titleStyle = {
  color: "#1a1a1a",
  fontSize: "32px",
  fontWeight: "700" as const,
  lineHeight: "40px",
  margin: "0 0 12px 0",
};

const subtitleStyle = {
  color: "#6b7280",
  fontSize: "18px",
  lineHeight: "26px",
  margin: "0",
};

const dividerStyle = {
  borderColor: "#e5e7eb",
  borderTopWidth: "1px",
  margin: "0 40px",
};

const contentSectionStyle = {
  padding: "32px 40px",
};

const footerStyle = {
  backgroundColor: "#f9fafb",
  padding: "24px 40px 32px",
  textAlign: "center" as const,
};

const footerTextStyle = {
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 12px 0",
};

const footerLinksStyle = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 16px 0",
};

const linkStyle = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const copyrightStyle = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0",
};

// Export default for direct import
export default ReleaseNoteEmail;
