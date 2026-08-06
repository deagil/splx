import type { SubagentActivity } from "./subagent-activity";

/**
 * Per-subagent orb tinting.
 *
 * The `thinking-orbs` patch paints a fixed orange ink ramp with no colour API,
 * so subagents are differentiated with a CSS `hue-rotate` over the canvas.
 * Rotations are measured from the orange base (~25°). The parent agent keeps
 * the untinted brand orange — only delegated children are recoloured.
 */

type SubagentHue = {
  name: string;
  /** Degrees from the orange base. */
  rotate: number;
};

const SUBAGENT_HUES: SubagentHue[] = [
  { name: "magenta", rotate: 290 },
  { name: "green", rotate: 120 },
  { name: "blue", rotate: 185 },
  { name: "purple", rotate: 245 },
  { name: "red", rotate: 335 },
  { name: "teal", rotate: 150 },
];

/** Stable non-cryptographic hash so a subagent keeps its colour across turns. */
function hashKey(key: string): number {
  let hash = 2_166_136_261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash);
}

function filterFor(hue: SubagentHue): string {
  // Slight saturation lift keeps the rotated hues as vivid as the orange base.
  return `hue-rotate(${hue.rotate}deg) saturate(1.08)`;
}

/**
 * Assign each running subagent a distinct orb colour.
 *
 * The hash alone would collide often at three or four children (six hues), so
 * a taken colour falls through to the next free one. Identity drives the
 * choice rather than roster position, so a subagent keeps its colour when an
 * earlier sibling finishes and the list shifts up.
 */
export function assignSubagentColors(
  subagents: readonly SubagentActivity[]
): Map<string, string> {
  const assigned = new Map<string, string>();
  const taken = new Set<number>();

  for (const subagent of subagents) {
    const start =
      hashKey(subagent.name || subagent.callId) % SUBAGENT_HUES.length;

    let index = start;
    for (let step = 0; step < SUBAGENT_HUES.length; step++) {
      const candidate = (start + step) % SUBAGENT_HUES.length;
      if (!taken.has(candidate)) {
        index = candidate;
        break;
      }
    }

    taken.add(index);
    // biome-ignore lint/style/noNonNullAssertion: index is modulo the array length
    assigned.set(subagent.callId, filterFor(SUBAGENT_HUES[index]!));
  }

  return assigned;
}
