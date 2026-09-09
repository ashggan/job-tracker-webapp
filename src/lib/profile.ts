import type { UserProfile } from "@prisma/client";

export interface ResumeExperienceEntry {
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
}

export interface ResumeEducationEntry {
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
}

export interface ResumeStructured {
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string;
  };
  summary?: string;
  skills: string[];
  experience: ResumeExperienceEntry[];
  education: ResumeEducationEntry[];
}

export const EMPTY_RESUME_STRUCTURED: ResumeStructured = {
  contact: {},
  summary: "",
  skills: [],
  experience: [],
  education: [],
};

export function parseResumeStructured(value: UserProfile["resumeStructured"]): ResumeStructured {
  if (!value || typeof value !== "object") return EMPTY_RESUME_STRUCTURED;
  const v = value as Partial<ResumeStructured>;
  return {
    contact: v.contact ?? {},
    summary: v.summary ?? "",
    skills: Array.isArray(v.skills) ? v.skills : [],
    experience: Array.isArray(v.experience) ? v.experience : [],
    education: Array.isArray(v.education) ? v.education : [],
  };
}

// Required before scoring/tailoring/aggregation filtering are useful (§5.1) —
// those entry points don't exist yet (M6+), so this isn't enforced anywhere yet.
export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (!profile.resumeFileUrl) return false;
  if (!profile.preferencesText?.trim()) return false;
  return true;
}
