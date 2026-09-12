import type { FitLabel, Prisma, Stage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STAGE_ORDER } from "@/lib/stages";

export async function getBoardColumns(userId: string) {
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return STAGE_ORDER.map((stage) => ({
    stage,
    jobs: applications.filter((app) => app.stage === stage),
  }));
}

export type TableFilters = {
  q?: string;
  stage?: Stage;
  fitLabel?: FitLabel;
  source?: string;
  days?: number;
  sort?: "dateApplied" | "jobTitle" | "company" | "fitScore" | "stage" | "deadline";
  dir?: "asc" | "desc";
};

export async function getTableRows(userId: string, filters: TableFilters) {
  const where: Prisma.ApplicationWhereInput = { userId };

  if (filters.stage) where.stage = filters.stage;
  if (filters.fitLabel) where.fitLabel = filters.fitLabel;
  if (filters.source) where.source = filters.source;
  if (filters.days) {
    where.dateFound = { gte: new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000) };
  }
  if (filters.q) {
    where.OR = [
      { jobTitle: { contains: filters.q, mode: "insensitive" } },
      { company: { contains: filters.q, mode: "insensitive" } },
      { notes: { some: { body: { contains: filters.q, mode: "insensitive" } } } },
    ];
  }

  const sortField = filters.sort ?? "dateApplied";
  const dir = filters.dir ?? "desc";
  const orderBy: Prisma.ApplicationOrderByWithRelationInput =
    sortField === "dateApplied"
      ? { dateApplied: dir }
      : sortField === "jobTitle"
        ? { jobTitle: dir }
        : sortField === "company"
          ? { company: dir }
          : sortField === "fitScore"
            ? { fitScore: dir }
            : sortField === "deadline"
              ? { deadline: dir }
              : { stage: dir };

  return prisma.application.findMany({
    where,
    orderBy,
    include: { notes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}

export async function getDistinctSources(userId: string): Promise<string[]> {
  const rows = await prisma.application.findMany({
    where: { userId },
    select: { source: true },
    distinct: ["source"],
  });
  return rows.map((r) => r.source).sort();
}

export async function getApplicationForUser(userId: string, id: string) {
  const application = await prisma.application.findFirst({ where: { id, userId } });
  return application;
}
