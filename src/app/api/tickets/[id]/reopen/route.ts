import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dispatchWebhookEvent } from "@/lib/webhooks";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { organization: true, createdBy: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
    }

    // Only ticket creator or admin can reopen
    if (user.id !== ticket.createdById && user.role !== "ADMIN" && user.role !== "SERVICE") {
      return NextResponse.json({ error: "Sadece talep sahibi veya yönetici talebi tekrar açabilir." }, { status: 403 });
    }

    if (ticket.status !== "COMPLETED" && ticket.status !== "CLOSED") {
      return NextResponse.json({ error: "Sadece tamamlanmış veya kapatılmış talepler tekrar açılabilir." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { reason = "Talep sahibi tarafından ek işlem için tekrar açıldı." } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.ticket.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          closedAt: null,
          completedAt: null,
        },
        include: {
          organization: true,
          createdBy: { select: { id: true, fullName: true, email: true, role: true } },
          assignedTo: { select: { id: true, fullName: true, email: true } },
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: id,
          actorId: user.id,
          eventType: "REOPENED",
          oldValue: ticket.status,
          newValue: "IN_PROGRESS",
          metadata: JSON.stringify({ reason }),
        },
      });

      await tx.ticketComment.create({
        data: {
          ticketId: id,
          userId: user.id,
          type: "SYSTEM_EVENT",
          content: `Talep tekrar açıldı. Neden: "${reason}"`,
          isInternal: false,
        },
      });

      return res;
    });

    dispatchWebhookEvent("ticket.reopened", {
      id: updated.id,
      ticket_number: updated.ticketNumber,
      public_id: `#${updated.ticketNumber}`,
      title: updated.title,
      description: updated.description,
      status: "IN_PROGRESS",
      priority: updated.priority,
      category: updated.category,
      organization: {
        id: updated.organization.id,
        name: updated.organization.name,
        slug: updated.organization.slug,
      },
      requester: {
        id: updated.createdBy.id,
        name: updated.createdBy.fullName,
        email: updated.createdBy.email,
      },
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    });

    return NextResponse.json({ ticket: updated });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("POST reopen ticket error:", err);
    return NextResponse.json(
      { error: "Talep tekrar açılırken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
