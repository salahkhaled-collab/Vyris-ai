// Test preload: in-memory stand-in for prisma.rateLimit (no database here).
import { prisma } from "@/lib/prisma";
const rows = new Map<string, { key: string; count: number; windowStart: Date }>();
Object.defineProperty(prisma, "rateLimit", {
  configurable: true,
  value: {
    upsert: async (a: any) => {
      const r = rows.get(a.where.key);
      if (r) { r.count += 1; return { ...r }; }
      const n = { ...a.create }; rows.set(n.key, n); return { ...n };
    },
    update: async (a: any) => { const r = rows.get(a.where.key)!; Object.assign(r, a.data); return { ...r }; },
    findUnique: async (a: any) => (rows.get(a.where.key) ? { ...rows.get(a.where.key)! } : null),
    deleteMany: async (a: any) => ({ count: rows.delete(a.where.key) ? 1 : 0 }),
  },
});
(globalThis as any).__rateLimitRows = rows;
