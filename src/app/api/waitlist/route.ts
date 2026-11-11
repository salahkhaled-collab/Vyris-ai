import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWaitlistInput } from "@/lib/waitlist";

/**
 * POST /api/waitlist — public. Adds an email to the early-access list.
 * Joining twice is fine and answers the same way, so the form can't be used
 * to find out whether an address is already on the list.
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = parseWaitlistInput(body);
  if (parsed === "bot") return NextResponse.json({ ok: true });
  if ("error" in parsed) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error }, { status: 400 });
  }
  try {
    await prisma.waitlistEntry.upsert({
      where: { email: parsed.email },
      create: parsed,
      // Keep the original sign-up date and source; refresh the details they typed.
      update: { name: parsed.name, ...(parsed.company ? { company: parsed.company } : {}) },
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Waitlist signup failed:", err);
    return NextResponse.json(
      { error: "server_error", message: "Couldn't save that right now. Please try again." },
      { status: 500 }
    );
  }
}
