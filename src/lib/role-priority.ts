import { PriorityItem, MetricCard } from "@/types";
import { Role } from "@/lib/user-context";

type Category = "decision" | "execution" | "external" | "brand";

/**
 * Defines how strongly each role weights each category when ranking
 * dashboard content. Higher = surfaces first. This is the one place
 * that encodes "what does role X actually care about more" — change
 * weights here rather than touching component code.
 */
const ROLE_WEIGHTS: Record<Role, Record<Category, number>> = {
  CEO: { decision: 3, external: 2, brand: 1, execution: 0 },
  FOUNDER: { decision: 3, external: 2, brand: 1, execution: 0 },
  EXECUTIVE: { decision: 2, execution: 2, external: 1, brand: 0 },
  MANAGER: { execution: 3, decision: 1, external: 1, brand: 0 },
  OTHER: { decision: 1, execution: 1, external: 1, brand: 1 }, // no bias
};

function weightFor(role: Role | null, category: Category): number {
  if (!role) return ROLE_WEIGHTS.OTHER[category];
  return ROLE_WEIGHTS[role][category];
}

/**
 * Reorders the priority ledger so items matching the role's emphasis
 * surface first. Stable sort: ties keep their original relative order
 * (their original `rank`), so this never feels random.
 */
export function sortLedgerForRole(items: PriorityItem[], role: Role | null): PriorityItem[] {
  return [...items]
    .sort((a, b) => {
      const diff = weightFor(role, b.category) - weightFor(role, a.category);
      return diff !== 0 ? diff : a.rank - b.rank;
    })
    .map((item, idx) => ({ ...item, rank: idx + 1 })); // renumber to match new order
}

/**
 * Reorders metric cards the same way, so the lead metric matches what
 * the role cares about most (e.g. CEO sees "Open Decisions" first,
 * Manager sees "Active Projects" first).
 */
export function sortMetricsForRole(items: MetricCard[], role: Role | null): MetricCard[] {
  return [...items].sort((a, b) => weightFor(role, b.category) - weightFor(role, a.category));
}
