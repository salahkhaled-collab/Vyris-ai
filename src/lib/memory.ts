import { prisma } from "@/lib/prisma";

export async function getMemories(userId: string) {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function saveMemory(userId: string, content: string) {
  return prisma.memory.create({ data: { userId, content } });
}
