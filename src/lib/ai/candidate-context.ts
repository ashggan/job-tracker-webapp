import { prisma } from "@/lib/prisma";

// Resume content (from the upload/parse feature, §5.10) is the primary
// signal -- "what they've done". preferencesText (legacy UserProfile field)
// is a secondary, optional layer on top -- "what they want". Returns null
// when neither is available; callers gate their own AI call on that.
export async function loadCandidateContext(userId: string): Promise<string | null> {
  const [resume, profile] = await Promise.all([
    prisma.userResume.findUnique({ where: { userId } }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  const hasResume =
    !!resume && resume.parseStatus !== "FAILED" && resume.extractedText.trim().length > 0;
  const hasPreferences = !!profile?.preferencesText?.trim();
  if (!hasResume && !hasPreferences) return null;

  return [
    hasResume ? `Candidate resume:\n${resume!.extractedText}` : null,
    hasPreferences ? `Candidate preferences/notes:\n${profile!.preferencesText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
