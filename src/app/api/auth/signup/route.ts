import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSignupInput } from "@/lib/signup";
import { clientIp, consume, HOUR } from "@/lib/rate-limit";

const SIGNUPS_PER_IP_PER_HOUR = 10;

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const input = parseSignupInput(body);
  if ("error" in input) {
    return NextResponse.json(input, { status: 400 });
  }

  try {
    if (!(await consume(`signup:${clientIp(req.headers)}`, SIGNUPS_PER_IP_PER_HOUR, HOUR))) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many sign-ups from this network. Try again later." },
        { status: 429 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: "user_exists", message: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: "CEO",
        accessLevel: "ADMIN",
        onboarded: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "user_exists", message: "An account with this email already exists." },
        { status: 400 }
      );
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
