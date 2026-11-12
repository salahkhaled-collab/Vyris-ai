import { prisma } from "@/lib/prisma";

/**
 * Who may delete a record shared with the team: its owner, or a team admin.
 * Pure rule, kept separate so it can be tested without a database.
 */
export function mayDelete(
  record: { ownerId: string },
  caller: { id: string; accessLevel: "ADMIN" | "MEMBER" | null }
): boolean {
  return record.ownerId === caller.id || caller.accessLevel === "ADMIN";
}

/** `mayDelete` for the signed-in user. Call only after the caller's access to the record is confirmed. */
export async function callerMayDelete(userId: string, record: { ownerId: string }): Promise<boolean> {
  if (record.ownerId === userId) return true;
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { accessLevel: true } });
  return mayDelete(record, { id: userId, accessLevel: me?.accessLevel ?? null });
}
