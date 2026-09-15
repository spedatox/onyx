import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCommentOnTicket } from "@/lib/permissions";
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

    if (!canCommentOnTicket(user, ticket)) {
      return NextResponse.json({ error: "Bu talebe yorum yapma yetkiniz yok" }, { status: 403 });
    }

    const body = await req.json();
    const { content, isInternal = false, attachmentIds = [] } = body;

    if (!content?.trim() && attachmentIds.length === 0) {
      return NextResponse.json({ error: "Yorum içeriği veya dosya gereklidir." }, { status: 400 });
    }

    // Only ADMIN or SERVICE can make internal notes
    const internalNote = Boolean(isInternal) && (user.role === "ADMIN" || user.role === "SERVICE");

    let commentType = "USER_MESSAGE";
    if (user.role === "ADMIN") {
      commentType = internalNote ? "INTERNAL_NOTE" : "ADMIN_MESSAGE";
    } else if (user.role === "SERVICE") {
      commentType = "SPEDA_EVENT";
    }

    // Check if ticket was WAITING and user replied: auto transition to IN_PROGRESS (per design doc section 9)
    let autoResumed = false;
    if (ticket.status === "WAITING" && user.id === ticket.createdById && !internalNote) {
      autoResumed = true;
    }

    const result = await prisma.$transaction(async (tx) => {
      const comment = await tx.ticketComment.create({
        data: {
          ticketId: id,
          userId: user.id,
          type: commentType,
          content: content?.trim() || "Ek dosya yüklendi.",
          isInternal: internalNote,
        },
        include: {
          user: {
            select: { id: true, fullName: true, role: true, avatarUrl: true },
          },
          attachments: true,
        },
      });

      // Link attachments to comment & ticket
      if (attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: attachmentIds } },
          data: { commentId: comment.id, ticketId: id },
        });
      }

      // Log event
      await tx.ticketEvent.create({
        data: {
          ticketId: id,
          actorId: user.id,
          eventType: "COMMENT_ADDED",
          metadata: JSON.stringify({
            commentId: comment.id,
            isInternal: internalNote,
            type: commentType,
          }),
        },
      });

      if (autoResumed) {
        await tx.ticket.update({
          where: { id },
          data: { status: "IN_PROGRESS" },
        });

        await tx.ticketEvent.create({
          data: {
            ticketId: id,
            actorId: user.id,
            eventType: "STATUS_CHANGED",
            oldValue: "WAITING",
            newValue: "IN_PROGRESS",
            metadata: JSON.stringify({ note: "Kullanıcı yanıtı üzerine otomatik işlem durumuna alındı." }),
          },
        });
      }

      return comment;
    });

    // Outbound webhook dispatch
    if (!internalNote) {
      dispatchWebhookEvent("ticket.comment.created", {
        id: ticket.id,
        ticket_number: ticket.ticketNumber,
        public_id: `#${ticket.ticketNumber}`,
        title: ticket.title,
        description: ticket.description,
        status: autoResumed ? "IN_PROGRESS" : ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        organization: {
          id: ticket.organization.id,
          name: ticket.organization.name,
          slug: ticket.organization.slug,
        },
        requester: {
          id: ticket.createdBy.id,
          name: ticket.createdBy.fullName,
          email: ticket.createdBy.email,
        },
        created_at: ticket.createdAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        comment: {
          id: result.id,
          content: result.content,
          author: user.fullName,
        },
      });
    }

    return NextResponse.json({ comment: result }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("POST comment error:", err);
    return NextResponse.json(
      { error: "Yorum eklenirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
