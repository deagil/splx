import {
  Text,
  Heading,
  Img,
  Section,
} from '@react-email/components'
import type { ContentBlock } from '@/lib/types/releases'

type EmailContentBlockProps = {
  block: ContentBlock
  baseUrl?: string
}

const textStyles = {
  paragraph: {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#1a1a1a',
    margin: '0 0 24px 0',
  },
  lead: {
    fontSize: '18px',
    lineHeight: '28px',
    color: '#1a1a1a',
    margin: '0 0 24px 0',
  },
  muted: {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#6b7280',
    margin: '0 0 24px 0',
  },
}

const headingStyles = {
  2: {
    fontSize: '28px',
    lineHeight: '36px',
    fontWeight: '600' as const,
    color: '#1a1a1a',
    margin: '32px 0 16px 0',
    textAlign: 'center' as const,
  },
  3: {
    fontSize: '22px',
    lineHeight: '30px',
    fontWeight: '600' as const,
    color: '#1a1a1a',
    margin: '24px 0 12px 0',
  },
}

export function EmailContentBlock({
  block,
  baseUrl = 'https://suplex.studio',
}: EmailContentBlockProps) {
  switch (block.type) {
    case 'text':
      return (
        <Text style={textStyles[block.variant ?? 'paragraph']}>
          {block.content}
        </Text>
      )

    case 'heading':
      return (
        <Heading as={`h${block.level}`} style={headingStyles[block.level]}>
          {block.content}
        </Heading>
      )

    case 'list':
      return (
        <Section style={{ margin: '0 0 24px 0' }}>
          {block.items.map((item, index) => (
            <Text
              key={index}
              style={{
                fontSize: '16px',
                lineHeight: '26px',
                color: '#6b7280',
                margin: '0 0 12px 0',
                paddingLeft: '20px',
              }}>
              • {item}
            </Text>
          ))}
        </Section>
      )

    case 'media':
      // Make sure image URLs are absolute
      const imageSrc = block.src.startsWith('http')
        ? block.src
        : `${baseUrl}${block.src}`

      return (
        <Section style={{ margin: '32px 0', textAlign: 'center' as const }}>
          <Img
            src={imageSrc}
            alt={block.alt ?? ''}
            width="100%"
            style={{
              maxWidth: '600px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          />
          {block.caption && (
            <Text
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6b7280',
                margin: '12px 0 0 0',
                textAlign: 'center' as const,
              }}>
              {block.caption}
            </Text>
          )}
        </Section>
      )

    default:
      return null
  }
}

export function EmailContentBlocks({
  sections,
  baseUrl,
}: {
  sections: ContentBlock[]
  baseUrl?: string
}) {
  return (
    <>
      {sections.map((block, index) => (
        <EmailContentBlock key={index} block={block} baseUrl={baseUrl} />
      ))}
    </>
  )
}
