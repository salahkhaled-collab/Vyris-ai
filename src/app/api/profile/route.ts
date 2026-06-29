import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Role, WorkspaceType } from "@prisma/client";

const VALID_ROLES: Role[] = ["CEO", "FOUNDER", "EXECUTIVE", "MANAGER", "OTHER"];
const VALID_WORKSPACES: WorkspaceType[] = ["PERSONAL", "TEAM"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, workspaceType: true, onboarded: true },
  });

  return NextResponse.json(user);
}

interface ProfilePatchBody {
  role?: Role;
  workspaceType?: WorkspaceType;
  onboarded?: boolean;
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: ProfilePatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const data: ProfilePatchBody = {};

  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }
    data.role = body.role;
  }

  if (body.workspaceType !== undefined) {
    if (!VALID_WORKSPACES.includes(body.workspaceType)) {
      return NextResponse.json({ error: "invalid_workspace_type" }, { status: 400 });
    }
    data.workspaceType = body.workspaceType;

    if (body.workspaceType === "TEAM") {
      const existing = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
      });
      if (!existing?.teamId) {
        const team = await prisma.team.create({
          data: { name: `${session.user.name ?? "My"}'s Team` },
        });
        await prisma.user.update({
          where: { id: session.user.id },
          data: { teamId: team.id },
        });
      }
    }
  }

  if (body.onboarded !== undefined) {
    data.onboarded = body.onboarded;
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { role: true, workspaceType: true, onboarded: true },
  });

  return NextResponse.json(updated);
}
