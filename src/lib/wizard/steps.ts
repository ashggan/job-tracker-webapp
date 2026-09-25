// Shared between WizardShell (client) and the draft loader (server) -- the
// latter needs to validate a stored draft's `step` field against the same
// list without pulling in a "use client" module.
export const STEPS = ["Posting", "Review", "Check", "Fit", "Materials", "Save"] as const;
export const STEP_KEYS = ["posting", "review", "duplicate", "fit", "materials", "save"] as const;
export type Step = (typeof STEP_KEYS)[number];
