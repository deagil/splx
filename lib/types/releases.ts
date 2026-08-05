// Content block types for release notes

export interface TextBlock {
  content: string;
  type: "text";
  variant?: "paragraph" | "lead" | "muted";
}

export interface HeadingBlock {
  content: string;
  level: 2 | 3;
  type: "heading";
}

export interface ListBlock {
  items: string[];
  type: "list";
}

export interface MediaBlock {
  alt?: string;
  browserFrame?: boolean;
  caption?: string;
  mediaType: "image" | "gif" | "video";
  src: string;
  type: "media";
}

export type ContentBlock = TextBlock | HeadingBlock | ListBlock | MediaBlock;

// Author info for floating video player
export interface ReleaseAuthor {
  avatarSrc?: string;
  name: string;
  role: string;
  videoDuration?: string;
  videoUrl?: string;
}

// Main release note type
export interface ReleaseNote {
  appVersion: string;

  // Author (optional, for floating video)
  author?: ReleaseAuthor;
  date: string; // ISO date string
  emailPreviewText?: string;

  // Email-specific
  emailSubject?: string;
  issueNumber: string;
  location?: string;

  // Preview card (for past issues grid)
  previewImage: string;
  publicationName?: string;

  // Content sections
  sections: ContentBlock[];
  // Metadata
  slug: string;
  subtitle?: string;
  title: string;
}
