import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewTicket, canViewInternalNotes } from "@/lib/permissions";
import { dispatchWebhookEvent } from "@/lib/webhooks";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        organization: true,
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: { id: true, fullName: true, role: true },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, fullName: true, role: true, avatarUrl: true },
            },
            attachments: true,
          },
        },
        events: {
          orderBy: { createdAt: "asc" },
          include: {
            actor: {
              select: { id: true, fullName: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
    }

    if (!canViewTicket(user, ticket)) {
      return NextResponse.json({ error: "Bu talebi görüntüleme yetkiniz yok" }, { status: 403 });
    }

    // Filter out internal notes if not admin/service
    const canSeeInternal = canViewInternalNotes(user);
    const visibleComments = canSeeInternal
      ? ticket.comments
      : ticket.comments.filter((c) => !c.isInternal);

    return NextResponse.json({
      ticket: {
        ...ticket,
        comments: visibleComments,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("GET ticket detail error:", err);
    return NextResponse.json(
      { error: "Talep yüklenirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.ticket.findUnique({
      where: { id },
      include: { organization: true, createdBy: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
    }

    const body = await req.json();
    const { status, priority, assignedToId, waitingReason, cancelReason, targetDate } = body;

    // Permissions check
    if (priority && priority !== existing.priority) {
      if (user.role !== "ADMIN" && user.role !== "SERVICE") {
        return NextResponse.json({ error: "Öncelik sadece yönetici tarafından değiştirilebilir." }, { status: 403 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    const eventsToCreate: Array<{
      eventType: string;
      oldValue?: string | null;
      newValue?: string | null;
      metadata?: string;
    }> = [];

    // Priority Change
    if (priority && priority !== existing.priority) {
      updateData.priority = priority;
      eventsToCreate.push({
        eventType: "PRIORITY_CHANGED",
        oldValue: existing.priority,
        newValue: priority,
      });
    }

    // Assignment Change
    if (assignedToId !== undefined && assignedToId !== existing.assignedToId) {
      if (user.role !== "ADMIN" && user.role !== "SERVICE") {
        return NextResponse.json({ error: "Atama yetkiniz yok." }, { status: 403 });
      }
      updateData.assignedToId = assignedToId || null;
      eventsToCreate.push({
        eventType: "ASSIGNED",
        oldValue: existing.assignedToId,
        newValue: assignedToId || "UNASSIGNED",
      });
    }

    // Status Change
    let statusChanged = false;
    if (status && status !== existing.status) {
      statusChanged = true;
      updateData.status = status;

      if (status === "IN_PROGRESS" && !existing.startedAt) {
        updateData.startedAt = new Date();
      }

      if (status === "WAITING") {
        if (!waitingReason?.trim()) {
          return NextResponse.json({ error: "Bekleme sebebi belirtilmelidir." }, { status: 400 });
        }
        updateData.waitingReason = waitingReason.trim();
      }

      if (status === "CANCELLED") {
        updateData.cancelledAt = new Date();
        if (cancelReason) {
          updateData.waitingReason = `İptal Sebebi: ${cancelReason.trim()}`;
        }
      }

      if (status === "CLOSED") {
        updateData.closedAt = new Date();
      }

      eventsToCreate.push({
        eventType: "STATUS_CHANGED",
        oldValue: existing.status,
        newValue: status,
        metadata: waitingReason ? JSON.stringify({ reason: waitingReason }) : undefined,
      });
    }

    if (targetDate !== undefined) {
      updateData.targetDate = targetDate ? new Date(targetDate) : null;
    }

    // Apply updates in transaction
    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.ticket.update({
        where: { id },
        data: updateData,
        include: {
          organization: true,
          createdBy: { select: { id: true, fullName: true, email: true, role: true } },
          assignedTo: { select: { id: true, fullName: true, email: true } },
        },
      });

      for (const ev of eventsToCreate) {
        await tx.ticketEvent.create({
          data: {
            ticketId: id,
            actorId: user.id,
            eventType: ev.eventType,
            oldValue: ev.oldValue,
            newValue: ev.newValue,
            metadata: ev.metadata,
          },
        });
      }

      return res;
    });

    // Webhook dispatch
    if (statusChanged) {
      dispatchWebhookEvent("ticket.status.changed", {
        id: updated.id,
        ticket_number: updated.ticketNumber,
        public_id: `#${updated.ticketNumber}`,
        title: updated.title,
        description: updated.description,
        status: updated.status,
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
        waiting_reason: updated.waitingReason,
        created_at: updated.createdAt.toISOString(),
        updated_at: updated.updatedAt.toISOString(),
      });
    }

    return NextResponse.json({ ticket: updated });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("PATCH ticket error:", err);
    return NextResponse.json(
      { error: "Talep güncellenirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
