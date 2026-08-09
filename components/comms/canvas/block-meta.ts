import {
  ImageIcon,
  type LucideIcon,
  MinusIcon,
  MousePointerClickIcon,
  MoveVerticalIcon,
  PanelBottomIcon,
  PanelTopIcon,
  TypeIcon,
} from "lucide-react";
import type { EmailBlock, EmailBlockType } from "@/lib/comms/types";

export const BLOCK_META: Record<
  EmailBlockType,
  { description: string; icon: LucideIcon; label: string }
> = {
  button: {
    description: "A call to action link",
    icon: MousePointerClickIcon,
    label: "Button",
  },
  divider: {
    description: "A horizontal rule",
    icon: MinusIcon,
    label: "Divider",
  },
  footer: {
    description: "Small print at the bottom",
    icon: PanelBottomIcon,
    label: "Footer",
  },
  header: {
    description: "Logo and product name",
    icon: PanelTopIcon,
    label: "Header",
  },
  heading: {
    description: "A section title",
    icon: TypeIcon,
    label: "Heading",
  },
  image: { description: "A hosted image", icon: ImageIcon, label: "Image" },
  spacer: {
    description: "Vertical breathing room",
    icon: MoveVerticalIcon,
    label: "Spacer",
  },
  text: { description: "A paragraph of copy", icon: TypeIcon, label: "Text" },
};

/** Blocks whose only content is text the author edits directly on the canvas. */
const TEXT_BLOCK_TYPES = new Set<EmailBlockType>([
  "footer",
  "header",
  "heading",
  "text",
]);

export function isTextBlock(block: EmailBlock): boolean {
  return TEXT_BLOCK_TYPES.has(block.type) || block.type === "button";
}

/** One-line summary shown next to a block in the left list. */
export function describeBlock(block: EmailBlock): string {
  switch (block.type) {
    case "header":
      return block.title || "Untitled header";
    case "heading":
    case "text":
    case "footer":
      return block.text || "Empty";
    case "button":
      return block.label || "Untitled button";
    case "image":
      return block.alt || block.src || "No image";
    case "spacer":
      return `${block.height ?? 16}px`;
    case "divider":
      return "—";
    default: {
      const _exhaustive: never = block;
      return String(_exhaustive);
    }
  }
}

export function createBlock(type: EmailBlockType): EmailBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "header":
      return { id, title: "Your product", type };
    case "heading":
      return { id, level: 1, text: "Heading", type };
    case "text":
      return { id, text: "Body copy goes here.", type };
    case "button":
      return { id, label: "Click here", type, url: "https://example.com" };
    case "image":
      return { alt: "", id, src: "", type };
    case "divider":
      return { id, type };
    case "spacer":
      return { height: 16, id, type };
    case "footer":
      return { id, text: "Footer note", type };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Fresh ids so a duplicated block never collides with its source. */
export function duplicateBlock(block: EmailBlock): EmailBlock {
  return { ...block, id: crypto.randomUUID() };
}
