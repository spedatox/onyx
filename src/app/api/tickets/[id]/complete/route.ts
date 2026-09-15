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

    if (user.role !== "ADMIN" && user.role !== "SERVICE") {
      return NextResponse.json({ error: "Talebi sadece yönetici tamamlayabilir." }, { status: 403 });
    }

    const { id } = await params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { organization: true, createdBy: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
    }

    const body = await req.json();
    const { completionSummary, completionUrl, attachmentIds = [] } = body;

    if (!completionSummary?.trim()) {
      return NextResponse.json(
        { error: "Tamamlama açıklaması (yapılan işin özeti) zorunludur." },
        { status: 400 }
      );
    }

    const completedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.ticket.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completionSummary: completionSummary.trim(),
          completionUrl: completionUrl?.trim() || null,
          completedAt,
        },
        include: {
          organization: true,
          createdBy: { select: { id: true, fullName: true, email: true, role: true } },
          assignedTo: { select: { id: true, fullName: true, email: true } },
        },
      });

      // Link any completion proof attachments
      if (attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: attachmentIds } },
          data: { ticketId: id },
        });
      }

      // Add completion event to audit log
      await tx.ticketEvent.create({
        data: {
          ticketId: id,
          actorId: user.id,
          eventType: "COMPLETED",
          oldValue: ticket.status,
          newValue: "COMPLETED",
          metadata: JSON.stringify({
            summary: completionSummary.trim(),
            url: completionUrl?.trim() || null,
            completedAt: completedAt.toISOString(),
          }),
        },
      });

      // System activity comment documenting completion
      await tx.ticketComment.create({
        data: {
          ticketId: id,
          userId: user.id,
          type: "SYSTEM_EVENT",
          content: `Talep tamamlandı. Açıklama: "${completionSummary.trim()}"`,
          isInternal: false,
        },
      });

      return res;
    });

    // Dispatch webhook for Speda
    dispatchWebhookEvent("ticket.completed", {
      id: updated.id,
      ticket_number: updated.ticketNumber,
      public_id: `#${updated.ticketNumber}`,
      title: updated.title,
      description: updated.description,
      status: "COMPLETED",
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
      completion_summary: updated.completionSummary,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    });

    return NextResponse.json({ ticket: updated });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("POST complete ticket error:", err);
    return NextResponse.json(
      { error: "Talep tamamlanırken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
