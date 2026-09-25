import type { TailoredCv } from "@/lib/ai/tailor-cv";
import type { ResumeSections } from "@/lib/ai/extract-resume-sections";

type TailoredContent = Pick<TailoredCv, "summary" | "experience" | "skills">;

function jobKey(company: string, title: string, dates: string): string {
  return `${company.trim().toLowerCase()}|${title.trim().toLowerCase()}|${dates.trim().toLowerCase()}`;
}

// tailorCv's prompt tells the model to never invent a skill or job the
// candidate doesn't have, but nothing enforces that -- a weaker/cheaper
// provider is the most likely to violate it, silently. This diffs the
// model's output against the resume's own real data (the source of truth)
// and strips anything that doesn't actually exist there, turning the
// prompt-only promise into an enforced one.
export function stripFabricatedContent(
  tailored: TailoredContent,
  sections: Pick<ResumeSections, "experience" | "skills">
): TailoredContent {
  const allowedSkills = new Set(
    sections.skills.flatMap((group) => group.items.map((item) => item.trim().toLowerCase()))
  );
  const skills = tailored.skills
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const kept = allowedSkills.has(item.trim().toLowerCase());
        if (!kept) console.warn("[stripFabricatedContent] dropped fabricated skill:", item);
        return kept;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const allowedJobs = new Set(
    sections.experience.map((job) => jobKey(job.company, job.title, job.dates))
  );
  const experience = tailored.experience.filter((job) => {
    const kept = allowedJobs.has(jobKey(job.company, job.title, job.dates));
    if (!kept) {
      console.warn("[stripFabricatedContent] dropped fabricated experience entry:", job.company, job.title);
    }
    return kept;
  });

  return { ...tailored, skills, experience };
}
