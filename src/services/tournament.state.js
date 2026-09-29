/** Explicit state machine: OPEN -> ACTIVE -> COMPLETED, no skipping, no going back. */
export const TRANSITIONS = { OPEN: ["ACTIVE"], ACTIVE: ["COMPLETED"], COMPLETED: [] };
export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;
