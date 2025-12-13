// Content block types for release notes

export type TextBlock = {
  type: 'text'
  content: string
  variant?: 'paragraph' | 'lead' | 'muted'
}

export type HeadingBlock = {
  type: 'heading'
  level: 2 | 3
  content: string
}

export type ListBlock = {
  type: 'list'
  items: string[]
}

export type MediaBlock = {
  type: 'media'
  mediaType: 'image' | 'gif' | 'video'
  src: string
  alt?: string
  caption?: string
  browserFrame?: boolean
}

export type ContentBlock = TextBlock | HeadingBlock | ListBlock | MediaBlock

// Author info for floating video player
export type ReleaseAuthor = {
  name: string
  role: string
  avatarSrc?: string
  videoUrl?: string
  videoDuration?: string
}

// Main release note type
export type ReleaseNote = {
  // Metadata
  slug: string
  issueNumber: string
  appVersion: string
  title: string
  subtitle?: string
  publicationName?: string
  date: string // ISO date string
  location?: string

  // Preview card (for past issues grid)
  previewImage: string

  // Content sections
  sections: ContentBlock[]

  // Author (optional, for floating video)
  author?: ReleaseAuthor

  // Email-specific
  emailSubject?: string
  emailPreviewText?: string
}
