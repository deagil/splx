# Release Notes System

This document explains how to create, manage, and distribute release notes for Suplex. The system supports both a public web page and email newsletter from the same content source.

## Overview

The release notes system consists of:

- **Content files** - TypeScript files in `/content/releases/` that define each release
- **Web pages** - Dynamic routes at `/whats-new` and `/whats-new/[slug]`
- **Email templates** - React Email components for newsletter distribution
- **API endpoint** - Generate email HTML at `/api/releases/[slug]/email`

## Quick Start

### Creating a New Release

1. Create a new file in `/content/releases/` (e.g., `v0.5.0.ts`)
2. Add the release to the index
3. Add demo assets to `/public/releases/v0.5.0/`
4. The new release automatically becomes the latest at `/whats-new`

## File Structure

```
/content/
  /releases/
    index.ts          # Aggregates all releases
    v0.4.0.ts         # Individual release files
    v0.5.0.ts
    ...

/public/
  /releases/
    /v0.4.0/          # Assets for each release
      hero.png
      demo.gif
      ...

/components/
  /releases/
    release-note-page.tsx       # Main page component
    content-block-renderer.tsx  # Renders content blocks
  /emails/
    release-note-email.tsx      # Email template
    email-content-block.tsx     # Email block renderer

/lib/
  /types/
    releases.ts       # Type definitions
  /releases/
    email.ts          # Email rendering utilities
```

## Creating a Release

### Step 1: Create the Content File

Create a new file at `/content/releases/v0.5.0.ts`:

```typescript
import type { ReleaseNote } from '@/lib/types/releases'

export const release: ReleaseNote = {
  // Unique URL slug (used in /whats-new/[slug])
  slug: 'v0-5-0-feature-name',

  // Metadata
  issueNumber: '002',
  appVersion: 'v0.5.0',
  title: 'Your Release Title',
  subtitle: 'Optional subtitle for more context',
  publicationName: 'Suplex Weekly',
  date: '2025-12-20T10:00:00-05:00', // ISO date string
  location: 'Brooklyn, USA',

  // Preview image for cards (800x600 recommended)
  previewImage: '/releases/v0.5.0/hero.png',

  // Optional: Author for floating video player
  author: {
    name: 'Your Name',
    role: 'Your Role',
    avatarSrc: '/releases/v0.5.0/avatar.png',
    videoUrl: '/releases/v0.5.0/intro.mp4', // Optional
    videoDuration: '1:30',
  },

  // Content sections (see Content Blocks below)
  sections: [
    // ... content blocks
  ],

  // Email-specific metadata
  emailSubject: 'Suplex Weekly #002: Your Release Title',
  emailPreviewText: 'Brief preview text for email clients.',
}
```

### Step 2: Add Content Blocks

The `sections` array contains content blocks that render on both web and email:

#### Text Block

```typescript
{
  type: 'text',
  content: 'Your paragraph text here.',
  variant: 'paragraph' | 'lead' | 'muted', // Optional, defaults to 'paragraph'
}
```

- `paragraph` - Standard body text
- `lead` - Larger, emphasized intro text
- `muted` - Secondary, lighter text

#### Heading Block

```typescript
{
  type: 'heading',
  level: 2 | 3, // h2 or h3
  content: 'Section Heading',
}
```

#### List Block

```typescript
{
  type: 'list',
  items: [
    'First bullet point',
    'Second bullet point',
    'Third bullet point',
  ],
}
```

#### Media Block

```typescript
{
  type: 'media',
  mediaType: 'image' | 'gif' | 'video',
  src: '/releases/v0.5.0/demo.gif',
  alt: 'Description for accessibility',
  caption: 'Optional caption below the media', // Optional
  browserFrame: true, // Optional: wrap in browser chrome
}
```

### Step 3: Register the Release

Update `/content/releases/index.ts`:

```typescript
import type { ReleaseNote } from '@/lib/types/releases'

import { release as v050 } from './v0.5.0'
import { release as v040 } from './v0.4.0'

// Releases are automatically sorted by date (newest first)
export const releases: ReleaseNote[] = [v050, v040].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
)

// ... rest of the file remains unchanged
```

### Step 4: Add Assets

Create the directory `/public/releases/v0.5.0/` and add:

| File | Purpose | Recommended Size |
|------|---------|------------------|
| `hero.png` | Preview image for cards | 800x600 |
| `avatar.png` | Author avatar (if using) | 200x200 |
| `demo.gif` | Feature demos | 1280x800, <10s, 15-20fps |
| `*.mp4` | Video content | 1280x720 |

## Routing

| URL | Description |
|-----|-------------|
| `/whats-new` | Shows the latest release |
| `/whats-new/[slug]` | Shows a specific release by slug |

The latest release is determined by the `date` field (most recent wins).

## Email Newsletter

### Preview Email HTML

Visit in browser:
```
/api/releases/v0-5-0-feature-name/email?format=html
```

### Get Email Data via API

```bash
curl /api/releases/v0-5-0-feature-name/email
```

Returns JSON:
```json
{
  "slug": "v0-5-0-feature-name",
  "subject": "Suplex Weekly #002: Your Release Title",
  "previewText": "Brief preview text for email clients.",
  "html": "<!DOCTYPE html>...",
  "text": "Plain text version..."
}
```

### Sending the Newsletter

The API returns ready-to-send HTML. Integrate with your email provider:

#### Using Resend

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Fetch the email content
const response = await fetch('/api/releases/v0-5-0-feature-name/email')
const { subject, html, text } = await response.json()

// Send to your list
await resend.emails.send({
  from: 'Suplex Weekly <updates@suplex.studio>',
  to: ['subscriber@example.com'],
  subject,
  html,
  text,
})
```

#### Using SendGrid

```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const response = await fetch('/api/releases/v0-5-0-feature-name/email')
const { subject, html, text } = await response.json()

await sgMail.send({
  to: 'subscriber@example.com',
  from: 'updates@suplex.studio',
  subject,
  html,
  text,
})
```

#### Using Mailchimp

Export the HTML and paste into a Mailchimp campaign, or use their API:

```typescript
const response = await fetch('/api/releases/v0-5-0-feature-name/email?format=html')
const html = await response.text()

// Use Mailchimp API to create campaign with this HTML
```

## Best Practices

### Content Writing

1. **Lead with value** - Start with the most important information
2. **Use clear headings** - Break content into scannable sections
3. **Keep paragraphs short** - 2-3 sentences max for email readability
4. **Include visuals** - GIFs and screenshots help explain features

### Demo GIFs

1. **Keep them short** - Under 10 seconds each
2. **Focus on one action** - Don't try to show everything
3. **Use consistent resolution** - 1280x800 works well
4. **Optimize file size** - Use tools like gifsicle or ezgif

### Email Considerations

1. **Test in multiple clients** - Gmail, Outlook, Apple Mail
2. **Keep images under 100KB** - Large images may not load
3. **Use absolute URLs** - Relative paths won't work in email
4. **Include alt text** - For accessibility and when images don't load

## Type Reference

### ReleaseNote

```typescript
type ReleaseNote = {
  slug: string              // URL-safe identifier
  issueNumber: string       // e.g., "001", "002"
  appVersion: string        // e.g., "v0.4.0"
  title: string             // Main headline
  subtitle?: string         // Optional secondary headline
  publicationName?: string  // e.g., "Suplex Weekly"
  date: string              // ISO date string
  location?: string         // e.g., "Brooklyn, USA"
  previewImage: string      // Path to preview image
  sections: ContentBlock[]  // Array of content blocks
  author?: ReleaseAuthor    // Optional author info
  emailSubject?: string     // Custom email subject
  emailPreviewText?: string // Email preview snippet
}
```

### ContentBlock

```typescript
type ContentBlock =
  | TextBlock
  | HeadingBlock
  | ListBlock
  | MediaBlock

type TextBlock = {
  type: 'text'
  content: string
  variant?: 'paragraph' | 'lead' | 'muted'
}

type HeadingBlock = {
  type: 'heading'
  level: 2 | 3
  content: string
}

type ListBlock = {
  type: 'list'
  items: string[]
}

type MediaBlock = {
  type: 'media'
  mediaType: 'image' | 'gif' | 'video'
  src: string
  alt?: string
  caption?: string
  browserFrame?: boolean
}
```

### ReleaseAuthor

```typescript
type ReleaseAuthor = {
  name: string
  role: string
  avatarSrc?: string
  videoUrl?: string
  videoDuration?: string
}
```

## Utility Functions

Available from `/content/releases`:

```typescript
import {
  releases,           // All releases (sorted by date)
  getLatestRelease,   // () => ReleaseNote | undefined
  getReleaseBySlug,   // (slug: string) => ReleaseNote | undefined
  getPastReleases,    // (excludeSlug?: string) => ReleaseNote[]
  getAllReleases,     // () => ReleaseNote[]
  formatReleaseDate,  // (dateString: string, options?) => string
} from '@/content/releases'
```

## Troubleshooting

### Release not showing as latest

- Check the `date` field is a valid ISO date string
- Ensure the date is more recent than other releases
- Verify the release is imported in `index.ts`

### Images not loading in email

- Use absolute URLs (e.g., `https://suplex.studio/releases/...`)
- Check image file size (keep under 100KB)
- Verify the image path is correct

### Type errors

- Ensure all required fields are present in the release object
- Check that `sections` contains valid `ContentBlock` types
- Verify import paths are correct
