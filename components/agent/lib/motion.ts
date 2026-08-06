/** Shared Motion springs / enters for agent UI (presence, activity). */

export const agentLayoutSpring = {
  damping: 34,
  mass: 0.7,
  stiffness: 420,
  type: "spring" as const,
};

/** Icon pop-in — matches make-interfaces-feel-better guidance. */
export const agentIconPop = {
  bounce: 0,
  duration: 0.3,
  type: "spring" as const,
};

export const agentRevealEase = [0.22, 1, 0.36, 1] as const;
