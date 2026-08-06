import type { LucideIcon } from "lucide-react";
import { SparklesIcon } from "lucide-react";
import type { ComposerSkillIcon } from "@/components/agent/lib/composer-skills";

/** Lucide icons keyed by `ComposerSkill.icon`. */
export const COMPOSER_SKILL_ICONS: Record<ComposerSkillIcon, LucideIcon> = {
  sparkles: SparklesIcon,
};

export function getComposerSkillIcon(icon: ComposerSkillIcon): LucideIcon {
  return COMPOSER_SKILL_ICONS[icon];
}

/**
 * Inline SVG markup for contenteditable skill mentions (vanilla DOM insert —
 * the chip is built with `document.createElement`, so React icons are not an
 * option). Keep paths in sync with the Lucide icons above.
 */
const COMPOSER_SKILL_ICON_SVG: Record<ComposerSkillIcon, string> = {
  sparkles:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>',
};

export function getComposerSkillIconSvg(icon: ComposerSkillIcon): string {
  return COMPOSER_SKILL_ICON_SVG[icon];
}
