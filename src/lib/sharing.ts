// src/lib/sharing.ts
//
// Share an existing record with your team, or make it private again.
// One rule for every shareable module (projects keep their own route):
//   * only the record's OWNER can change sharing;
//   * the team is always the owner's own team, never a value from the client.
// Server-only.

import { prisma } from "@/lib/prisma";

export const SHAREABLE_TYPES = ["decision", "risk", "objective", "strategicBet"] as const;
export type ShareableType = (typeof SHAREABLE_TYPES)[number];

export function isShareableType(value: unknown): value is ShareableType {
  return typeof value === "string" && (SHAREABLE_TYPES as readonly string[]).includes(value);
}

export type SharingResult =
  | { ok: true; teamId: string | null }
  | { ok: false; status: 400 | 403 | 404; error: string; message: string };

async function findOwner(type: ShareableType, id: string): Promise<{ ownerId: string } | null> {
  const select = { ownerId: true } as const;
  switch (type) {
    case "decision":
      return prisma.decision.findUnique({ where: { id }, select });
    case "risk":
      return prisma.risk.findUnique({ where: { id }, select });
    case "objective":
      return prisma.objective.findUnique({ where: { id }, select });
    case "strategicBet":
      return prisma.strategicBet.findUnique({ where: { id }, select });
  }
}

async function writeTeam(type: ShareableType, id: string, teamId: string | null): Promise<void> {
  const data = { teamId };
  switch (type) {
    case "decision":
      await prisma.decision.update({ where: { id }, data });
      return;
    case "risk":
      await prisma.risk.update({ where: { id }, data });
      return;
    case "objective":
      await prisma.objective.update({ where: { id }, data });
      return;
    case "strategicBet":
      await prisma.strategicBet.update({ where: { id }, data });
      return;
  }
}

export async function setSharing(
  type: ShareableType,
  id: string,
  userId: string,
  share: boolean
): Promise<SharingResult> {
  const record = await findOwner(type, id);
  if (!record) return { ok: false, status: 404, error: "not_found", message: "That item no longer exists." };
  if (record.ownerId !== userId) {
    return { ok: false, status: 403, error: "forbidden", message: "Only the owner can change sharing." };
  }

  let teamId: string | null = null;
  if (share) {
    const owner = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
    if (!owner?.teamId) {
      return { ok: false, status: 400, error: "no_team", message: "Enable a Team workspace before sharing." };
    }
    teamId = owner.teamId;
  }

  await writeTeam(type, id, teamId);
  return { ok: true, teamId };
}
