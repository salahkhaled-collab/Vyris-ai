// Who may change whom on a team. Pure, so the rules can be tested without a
// database; the API routes load the people and apply these.

export type Level = "ADMIN" | "MEMBER";
export interface Person {
  id: string;
  accessLevel: Level;
}

export type Verdict = { ok: true } | { ok: false; status: 403 | 409; message: string };

const no = (status: 403 | 409, message: string): Verdict => ({ ok: false, status, message });

/** Removing someone, or leaving yourself (actor === target). */
export function canRemove(actor: Person, target: Person, team: Person[]): Verdict {
  const self = actor.id === target.id;
  if (!self && actor.accessLevel !== "ADMIN") return no(403, "Only team admins can remove people.");
  const admins = team.filter((p) => p.accessLevel === "ADMIN");
  const othersRemain = team.some((p) => p.id !== target.id);
  if (target.accessLevel === "ADMIN" && admins.length === 1 && othersRemain) {
    return no(409, self ? "Make someone else an admin before you leave." : "A team needs at least one admin.");
  }
  return { ok: true };
}

/** Changing someone's access level. */
export function canChangeLevel(actor: Person, target: Person, next: Level, team: Person[]): Verdict {
  if (actor.accessLevel !== "ADMIN") return no(403, "Only team admins can change access.");
  if (target.accessLevel === "ADMIN" && next === "MEMBER") {
    const admins = team.filter((p) => p.accessLevel === "ADMIN");
    if (admins.length === 1) return no(409, "A team needs at least one admin. Make someone else an admin first.");
  }
  return { ok: true };
}
