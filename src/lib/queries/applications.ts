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
  days?: number;
  sort?: "dateApplied" | "jobTitle" | "company" | "fitScore" | "stage" | "deadline";
  dir?: "asc" | "desc";
};

// 10 per page for the table view (§ job-applications). The xlsx export route
// also builds on this same where-clause via buildTableWhere, but always
// wants every matching row -- pagination is opt-in (only getTableRows'
// `pagination` param), never baked into the shared filter logic itself.
export const TABLE_PAGE_SIZE = 10;

function buildTableWhere(userId: string, filters: TableFilters): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = { userId };

  if (filters.stage) where.stage = filters.stage;
  if (filters.fitLabel) where.fitLabel = filters.fitLabel;
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

  return where;
}

export async function getTableRowCount(userId: string, filters: TableFilters): Promise<number> {
  return prisma.application.count({ where: buildTableWhere(userId, filters) });
}

export async function getTableRows(
  userId: string,
  filters: TableFilters,
  pagination?: { page: number }
) {
  const where = buildTableWhere(userId, filters);

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
    ...(pagination
      ? { skip: (pagination.page - 1) * TABLE_PAGE_SIZE, take: TABLE_PAGE_SIZE }
      : {}),
    include: {
      notes: { orderBy: { createdAt: "desc" }, take: 1 },
      tailoredDocuments: { orderBy: { version: "desc" }, select: { id: true, kind: true } },
    },
  });
}

export async function getApplicationForUser(userId: string, id: string) {
  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: {
      tailoredDocuments: {
        orderBy: { version: "desc" },
        select: { id: true, kind: true, contentJson: true },
      },
      notes: { orderBy: { createdAt: "desc" } },
      stageEvents: { orderBy: { changedAt: "desc" } },
    },
  });
  return application;
}

// A handful of scalar fields -- for a caller (the elevate flow) that only
// needs to build a posting object, not the full detail-page record with its
// tailored-document contentJson blobs and full note/stage history.
export async function getApplicationPostingFieldsForUser(userId: string, id: string) {
  return prisma.application.findFirst({
    where: { id, userId },
    select: {
      id: true,
      jobTitle: true,
      company: true,
      descriptionText: true,
      requirements: true,
      niceToHaves: true,
      keywords: true,
      location: true,
      deadline: true,
    },
  });
}
