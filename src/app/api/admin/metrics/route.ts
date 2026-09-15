import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      openCount,
      inProgressCount,
      waitingCount,
      completedThisMonthCount,
      totalCount,
      tickets,
      recentEvents,
    ] = await Promise.all([
      prisma.ticket.count({ where: { status: "OPEN" } }),
      prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { status: "WAITING" } }),
      prisma.ticket.count({
        where: {
          status: { in: ["COMPLETED", "CLOSED"] },
          completedAt: { gte: startOfMonth },
        },
      }),
      prisma.ticket.count(),
      prisma.ticket.findMany({
        select: {
          id: true,
          status: true,
          category: true,
          organization: { select: { name: true } },
          createdBy: { select: { fullName: true } },
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.ticketEvent.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          ticket: { select: { id: true, ticketNumber: true, title: true } },
          actor: { select: { fullName: true } },
        },
      }),
    ]);

    // Breakdown by Organization
    const orgBreakdown: Record<string, number> = {};
    for (const t of tickets) {
      const orgName = t.organization?.name || "Diğer";
      orgBreakdown[orgName] = (orgBreakdown[orgName] || 0) + 1;
    }

    // Breakdown by Category
    const categoryBreakdown: Record<string, number> = {};
    for (const t of tickets) {
      const cat = t.category || "Diğer";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    }

    // Breakdown by Requester
    const requesterBreakdown: Record<string, number> = {};
    for (const t of tickets) {
      const name = t.createdBy?.fullName || "Bilinmeyen";
      requesterBreakdown[name] = (requesterBreakdown[name] || 0) + 1;
    }

    return NextResponse.json({
      metrics: {
        open: openCount,
        inProgress: inProgressCount,
        waiting: waitingCount,
        completedThisMonth: completedThisMonthCount,
        total: totalCount,
        breakdowns: {
          byOrganization: orgBreakdown,
          byCategory: categoryBreakdown,
          byRequester: requesterBreakdown,
        },
        recentActivity: recentEvents,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("GET admin metrics error:", err);
    return NextResponse.json(
      { error: "İstatistikler yüklenirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
