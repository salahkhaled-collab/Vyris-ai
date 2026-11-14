// src/lib/commitments-server.ts
//
// Server side of commitment tracking: the open promises for the morning brief.

import { prisma } from "@/lib/prisma";
import { sortCommitments, toBriefCommitment } from "@/lib/commitments";
import type { BriefCommitment } from "@/lib/morning-brief";

const MAX_IN_BRIEF = 12;

/** Open promises both ways, late and soonest first. Empty on any failure: the brief still goes out. */
export async function loadOpenCommitments(userId: string, now: Date, timeZone = "UTC"): Promise<BriefCommitment[]> {
  try {
    const rows = await prisma.commitment.findMany({
      where: { ownerId: userId, status: "OPEN" },
      select: { text: true, counterpart: true, direction: true, dueDate: true },
      take: 100,
    });
    return sortCommitments(rows)
      .slice(0, MAX_IN_BRIEF)
      .map((r) => toBriefCommitment(r, now, timeZone));
  } catch (err) {
    console.error("Loading commitments failed:", err);
    return [];
  }
}
