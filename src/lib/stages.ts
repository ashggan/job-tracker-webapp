import type { FitLabel, Stage } from "@prisma/client";

export const STAGE_ORDER: Stage[] = [
  "wishlist",
  "applied",
  "under_review",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export const STAGE_LABELS: Record<Stage, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  under_review: "Under Review",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const FIT_LABEL_ORDER: FitLabel[] = ["stretch", "fair", "good", "strong"];

export const FIT_META: Record<FitLabel, { label: string; color: string; light: string }> = {
  stretch: { label: "Stretch", color: "var(--stretch)", light: "var(--stretch-light)" },
  fair: { label: "Fair", color: "var(--fair)", light: "var(--fair-light)" },
  good: { label: "Good", color: "var(--good)", light: "var(--good-light)" },
  strong: { label: "Strong", color: "var(--strong)", light: "var(--strong-light)" },
};

export function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

const DUE_SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

// True for a deadline that's still ahead but within the next 3 days —
// doesn't flag one that's already passed, since that's a different signal.
export function isDueSoon(deadline: Date | null): boolean {
  if (!deadline) return false;
  const msUntil = deadline.getTime() - Date.now();
  return msUntil >= 0 && msUntil <= DUE_SOON_WINDOW_MS;
}
