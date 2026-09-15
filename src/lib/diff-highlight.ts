import { diffWords as jsDiffWords } from "diff";

export type DiffToken = { text: string; kind: "added" | "removed" | "unchanged" };

// Word-level diff between the resume's original text and the AI-tailored
// version of the same field (e.g. the summary) -- for inline highlighting.
export function diffText(original: string, tailored: string): DiffToken[] {
  return jsDiffWords(original, tailored).map((part) => ({
    text: part.value,
    kind: part.added ? "added" : part.removed ? "removed" : "unchanged",
  }));
}

// Bullets are reordered and reworded by tailoring, not edited in place, so a
// positional diff isn't meaningful -- exact-match set membership is what
// actually answers "is this the same point I already had, or a new/reworded
// one" for a bullet list.
export function isBulletUnchanged(bullet: string, originalBullets: string[]): boolean {
  return originalBullets.includes(bullet);
}

// Original bullets (for a job/project matched by company + project name)
// that don't appear anywhere in the tailored output -- i.e. cut entirely.
export function droppedBullets(originalBullets: string[], tailoredBullets: string[]): string[] {
  return originalBullets.filter((bullet) => !tailoredBullets.includes(bullet));
}

type ExperienceEntry = { company: string; projects: { name: string | null; bullets: string[] }[] };

// company + project name are preserved unchanged by tailoring, so they're a
// reliable key for pairing a tailored job/project back to its original.
export function findOriginalBullets(
  experience: ExperienceEntry[],
  company: string,
  projectName: string | null
): string[] {
  const job = experience.find((j) => j.company === company);
  const project = job?.projects.find((p) => p.name === projectName);
  return project?.bullets ?? [];
}
