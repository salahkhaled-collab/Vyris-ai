// lib/ai/tools.ts
//
// Vyris Intelligence's toolset. Each tool has:
//   - a schema (what Claude sees, sent in the `tools` param)
//   - an executor (what actually runs against Prisma, scoped to the caller)
//
// Scope is ONLY built server-side from the authenticated session (see the
// API route). Nothing here trusts a userId/teamId coming from the model
// or the request body.

import { prisma } from "@/lib/prisma";
import { scopeFilter, type Scope } from "./scope";

// ---- Tool schemas (Anthropic Messages API `tools` format) ----------------

export const VYRIS_TOOLS = [
  {
    name: "get_projects",
    description:
      "List the user's projects, optionally filtered by status. Use this to answer questions about what's currently being worked on.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["ACTIVE", "PAUSED", "DONE"],
          description: "Filter by project status. Omit to get all.",
        },
      },
    },
  },
  {
    name: "get_tasks",
    description:
      "List tasks, optionally filtered by status, project, or due date. Use this for 'what should I focus on', overdue work, or project-specific task lists.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] },
        projectId: { type: "string", description: "Filter to tasks in a specific project." },
        dueBeforeISO: {
          type: "string",
          description: "ISO date string. Returns tasks due on or before this date (e.g. to find overdue/upcoming work).",
        },
      },
    },
  },
  {
    name: "get_decisions",
    description:
      "List decisions, optionally filtered by status. Use this for 'what did we decide about X' or 'what's still unresolved'.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["OPEN", "DECIDED"] },
      },
    },
  },
  {
    name: "get_objectives",
    description:
      "List objectives (OKRs) and their key results, optionally filtered by quarter.",
    input_schema: {
      type: "object",
      properties: {
        quarter: { type: "string", description: "e.g. 'Q1-2026'. Omit for all." },
      },
    },
  },
  {
    name: "get_strategic_bets",
    description:
      "List strategic bets (longer-horizon initiatives) and their status (on track / at risk / off track).",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ON_TRACK", "AT_RISK", "OFF_TRACK"] },
      },
    },
  },
  {
    name: "get_risks",
    description: "List tracked business risks, optionally filtered by severity or status.",
    input_schema: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
        status: { type: "string", enum: ["OPEN", "MITIGATING", "RESOLVED"] },
      },
    },
  },
  {
    name: "search_contacts",
    description: "Search contacts by name, company, or tag.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, company, or tag to search for." },
      },
      required: ["query"],
    },
  },
] as const;

export type VyrisToolName = (typeof VYRIS_TOOLS)[number]["name"];

// ---- Executors -------------------------------------------------------------

export async function runTool(
  name: VyrisToolName,
  input: Record<string, unknown>,
  scope: Scope
): Promise<unknown> {
  const where = scopeFilter(scope);

  switch (name) {
    case "get_projects": {
      const status = input.status as string | undefined;
      return prisma.project.findMany({
        where: { ...where, ...(status ? { status: status as any } : {}) },
        select: { id: true, title: true, description: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
    }

    case "get_tasks": {
      const status = input.status as string | undefined;
      const projectId = input.projectId as string | undefined;
      const dueBeforeISO = input.dueBeforeISO as string | undefined;
      return prisma.task.findMany({
        where: {
          ...where,
          ...(status ? { status: status as any } : {}),
          ...(projectId ? { projectId } : {}),
          ...(dueBeforeISO ? { dueDate: { lte: new Date(dueBeforeISO) } } : {}),
        },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          projectId: true,
          objectiveId: true,
          strategicBetId: true,
        },
        orderBy: { dueDate: "asc" },
        take: 100,
      });
    }

    case "get_decisions": {
      const status = input.status as string | undefined;
      return prisma.decision.findMany({
        where: { ...where, ...(status ? { status: status as any } : {}) },
        select: {
          id: true,
          title: true,
          context: true,
          deadline: true,
          status: true,
          recommendation: true,
          options: { select: { label: true, score: true, pros: true, cons: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      });
    }

    case "get_objectives": {
      const quarter = input.quarter as string | undefined;
      return prisma.objective.findMany({
        where: { ...where, ...(quarter ? { quarter } : {}) },
        select: {
          id: true,
          title: true,
          quarter: true,
          keyResults: { select: { label: true, current: true, target: true, unit: true } },
        },
        take: 30,
      });
    }

    case "get_strategic_bets": {
      const status = input.status as string | undefined;
      return prisma.strategicBet.findMany({
        where: { ...where, ...(status ? { status: status as any } : {}) },
        select: { id: true, title: true, signal: true, horizon: true, status: true },
        take: 30,
      });
    }

    case "get_risks": {
      const severity = input.severity as string | undefined;
      const status = input.status as string | undefined;
      return prisma.risk.findMany({
        where: {
          ...where,
          ...(severity ? { severity: severity as any } : {}),
          ...(status ? { status: status as any } : {}),
        },
        select: { id: true, title: true, description: true, severity: true, status: true },
        take: 30,
      });
    }

    case "search_contacts": {
      const query = (input.query as string) ?? "";
      return prisma.contact.findMany({
        where: {
          ...where,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { company: { contains: query, mode: "insensitive" } },
            { tag: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, company: true, role: true, tag: true },
        take: 20,
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}