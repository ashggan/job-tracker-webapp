import type { ExtractedPosting } from "@/lib/ai/extract-posting";

// Only the posting fields fit/materials generation actually reads (see
// ScoreFitInput) — editing anything else (location, deadline, keywords)
// doesn't affect what a fit score or tailored CV would say, so it
// shouldn't force a re-generation.
export function buildPostingSignature(extracted: ExtractedPosting): string {
  return JSON.stringify({
    jobTitle: extracted.jobTitle,
    company: extracted.company,
    description: extracted.description,
    requirements: extracted.requirements,
    niceToHaves: extracted.niceToHaves,
  });
}
