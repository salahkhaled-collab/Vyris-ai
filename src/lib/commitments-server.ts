// Placeholder until commitment tracking lands: no promises tracked yet.
import type { BriefCommitment } from "@/lib/morning-brief";

export async function loadOpenCommitments(_userId: string, _now: Date): Promise<BriefCommitment[]> {
  return [];
}
