import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const convo = await prisma.aiConversation.findFirst({
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      title: true,
      messages: { orderBy: { createdAt: "asc" }, take: 200, select: { role: true, content: true, createdAt: true } },
    },
  });
  if (!convo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ conversation: convo });
}