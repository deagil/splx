/**
 * Skills exposed in the composer's `/` picker.
 *
 * Empty on day one. Agent C's entry here was its bid-writing skill, which is
 * its domain and did not come over; splx's own skills live in the `ai_skills`
 * table and get wired in through `/api/user/skills` in a follow-up pass (see
 * docs/EVE_AGENT_PORT.md §8.2). The picker, the chip DOM and the serialisation
 * are all live already — this registry is the only thing that has to change.
 */
export type ComposerSkillIcon = "sparkles";

export type ComposerSkill = {
  description: string;
  icon: ComposerSkillIcon;
  id: string;
  label: string;
  /** Plain text expanded into the outbound message when the mention is sent. */
  prompt: string;
};

export const COMPOSER_SKILLS: readonly ComposerSkill[] = [] as const;

export function filterComposerSkills(query: string): ComposerSkill[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...COMPOSER_SKILLS];
  }
  return COMPOSER_SKILLS.filter(
    (skill) =>
      skill.id.toLowerCase().includes(q) ||
      skill.label.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q)
  );
}

export function getComposerSkill(id: string): ComposerSkill | undefined {
  return COMPOSER_SKILLS.find((skill) => skill.id === id);
}
