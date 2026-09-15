import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import { resolveActiveKey } from "@/lib/ai/keys";
import { prisma } from "@/lib/prisma";

// Rough $/1M-token blended estimate (input+output average) per provider --
// same convention as the other AI call sites: for the usage-accounting
// panel, not billing-accurate.
const ROUGH_COST_PER_1M_TOKENS: Record<string, number> = {
  anthropic: 8,
  openai: 5,
  google: 1,
};

const resumeSectionsSchema = z.object({
  header: z.object({
    name: z.string().nullable(),
    title: z.string().nullable(),
    contacts: z.array(z.string()), // email/phone/location/links, verbatim, as listed
  }),
  summary: z.string().nullable(),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      dates: z.string(),
      // A job can have multiple named sub-projects (each with its own
      // bullets), or one implicit project (name: null) when the resume has
      // no sub-project structure for that role.
      projects: z.array(
        z.object({
          name: z.string().nullable(),
          bullets: z.array(z.string()),
        })
      ),
    })
  ),
  skills: z.array(
    z.object({
      category: z.string(),
      items: z.array(z.string()),
    })
  ),
  languages: z.array(z.string()),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string().nullable(),
      dates: z.string().nullable(),
    })
  ),
  // Anything that isn't summary/experience/skills/languages/education --
  // Certifications, Projects, Awards, Publications, whatever the resume
  // actually has -- keyed by the resume's own heading text.
  additionalSections: z.array(
    z.object({
      heading: z.string(),
      items: z.array(z.string()),
    })
  ),
});

export type ResumeSections = z.infer<typeof resumeSectionsSchema>;

/**
 * Extracts every section of a resume into structured data, exactly as
 * written -- this becomes the single source of truth both for the Profile
 * page's preview and for CV tailoring: header/languages/education/
 * additionalSections are facts tailoring copies through verbatim, while
 * summary/experience/skills are the fields tailoring is allowed to rewrite.
 *
 * Never throws: no API key configured, a provider error, or a timeout all
 * just return null. This must never block or fail an upload -- the resume
 * is already saved by the time this runs.
 */
export async function extractResumeSections(
  userId: string,
  resumeText: string
): Promise<ResumeSections | null> {
  let resolved;
  try {
    resolved = await resolveActiveKey(userId);
    if (!resolved) return null;
  } catch (error) {
    console.error("[extractResumeSections] key resolution failed", error);
    return null;
  }

  let object;
  let tokensUsed = 0;
  try {
    const model = getLanguageModel(resolved.provider, resolved.apiKey);
    const result = await generateObject({
      model,
      schema: resumeSectionsSchema,
      prompt:
        "Extract every section of this resume into structured data, exactly as written -- " +
        "don't summarize, paraphrase, or drop anything. header.contacts should be every " +
        "contact/link line (email, phone, location, website, LinkedIn, GitHub, etc.) as " +
        "separate strings, in the order they appear. For experience, group entries by real " +
        "employer/company -- a single job can have multiple named sub-projects (each with its " +
        "own bullets); use projects[].name for the sub-project's name when the resume names " +
        "one, or a single project with name: null when the role has no sub-project structure. " +
        "Never put a project name line inside bullets. Keep skills grouped into the same " +
        "categories the resume itself uses (e.g. Frontend, Backend, Databases), each as " +
        "{category, items}. Put any section that isn't summary/experience/skills/languages/" +
        "education (e.g. Certifications, Projects, Awards) into additionalSections, using the " +
        `resume's own heading text.\n\n${resumeText}`,
      abortSignal: AbortSignal.timeout(30_000),
    });
    object = result.object;
    tokensUsed = result.usage.totalTokens ?? 0;
  } catch (error) {
    console.error("[extractResumeSections] model call failed", error);
    return null;
  }

  // A real result is already in hand at this point -- a failure logging it
  // must not throw the result away. (Usage-accounting is a nice-to-have on
  // top of a successful extraction, not a precondition for returning one.)
  try {
    await prisma.aIUsageLog.create({
      data: {
        userId,
        action: "extract_resume",
        provider: resolved.provider,
        tokensUsed,
        costEstimate: (tokensUsed / 1_000_000) * (ROUGH_COST_PER_1M_TOKENS[resolved.provider] ?? 5),
      },
    });
  } catch (error) {
    console.error("[extractResumeSections] usage log write failed", error);
  }

  return object;
}
