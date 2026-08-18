import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

const STALE_THRESHOLD_DAYS = 14;

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
    });

    const ownershipFilter = {
        OR: [
            { ownerId: session.user.id },
            ...(user?.teamId ? [{ teamId: user.teamId }] : []),
        ],
    };

    const [objectives, strategicBets] = await Promise.all([
        prisma.objective.findMany({
            where: ownershipFilter,
            select: {
                id: true,
                title: true,
                updatedAt: true,
                tasks: { select: { updatedAt: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.strategicBet.findMany({
            where: ownershipFilter,
            select: {
                id: true,
                title: true,
                updatedAt: true,
                tasks: { select: { updatedAt: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const signals = [
        ...objectives.map((o) => toSignal("objective", o)),
        ...strategicBets.map((b) => toSignal("strategicBet", b)),
    ];

    return NextResponse.json(signals);
}

type DriftInput = {
    id: string;
    title: string;
    updatedAt: Date;
    tasks: { updatedAt: Date }[];
};

function toSignal(type: "objective" | "strategicBet", item: DriftInput) {
    return {
        type,
        id: item.id,
        title: item.title,
        driftStatus: computeDriftStatus(item),
    };
}

// "unlinked" — nothing points at this at all.
// "stale" — has linked tasks, but neither the item nor any linked task
//           has moved in STALE_THRESHOLD_DAYS.
// "ok" — active, no drift detected.
function computeDriftStatus(item: DriftInput): "unlinked" | "stale" | "ok" {
    if (item.tasks.length === 0) return "unlinked";

    const cutoff = Date.now() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    const mostRecentTaskUpdate = Math.max(
        ...item.tasks.map((t) => t.updatedAt.getTime())
    );
    const itemUpdatedRecently = item.updatedAt.getTime() > cutoff;
    const someTaskUpdatedRecently = mostRecentTaskUpdate > cutoff;

    if (!itemUpdatedRecently && !someTaskUpdatedRecently) return "stale";
    return "ok";
}