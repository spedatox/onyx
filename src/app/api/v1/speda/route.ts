import { NextRequest, NextResponse } from "next/server";
import { getUserByBearerToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import fs from "fs/promises";
import path from "path";

async function authenticateSpeda(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "").trim();
  return getUserByBearerToken(token);
}

// GET /api/v1/speda - List tickets or get ticket by query
export async function GET(req: NextRequest) {
  const service = await authenticateSpeda(req);
  if (!service) {
    return NextResponse.json({ error: "Invalid or missing Speda API Bearer token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticket_id");
  const ticketNumber = searchParams.get("ticket_number");
  const status = searchParams.get("status");

  if (ticketId || ticketNumber) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          ...(ticketId ? [{ id: ticketId }] : []),
          ...(ticketNumber ? [{ ticketNumber: parseInt(ticketNumber, 10) }] : []),
        ],
      },
      include: {
        organization: true,
        createdBy: { select: { fullName: true, email: true } },
        assignedTo: { select: { fullName: true, email: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { fullName: true, role: true } } },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) {
    where.status = status;
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      organization: true,
      createdBy: { select: { fullName: true, email: true } },
    },
  });

  return NextResponse.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      ticket_number: t.ticketNumber,
      public_id: `#${t.ticketNumber}`,
      title: t.title,
      status: t.status,
      priority: t.priority,
      category: t.category,
      organization: t.organization.name,
      requester: t.createdBy.fullName,
      created_at: t.createdAt,
    })),
  });
}

// POST /api/v1/speda - Tool actions: update status, add comment, complete ticket
export async function POST(req: NextRequest) {
  const service = await authenticateSpeda(req);
  if (!service) {
    return NextResponse.json({ error: "Invalid or missing Speda API Bearer token" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, ticket_id, ticket_number, status, content, completion_summary, completion_url } = body;

    // Resolve ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          ...(ticket_id ? [{ id: ticket_id }] : []),
          ...(ticket_number ? [{ ticketNumber: parseInt(ticket_number, 10) }] : []),
        ],
      },
      include: { organization: true, createdBy: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (action === "update_status" && status) {
      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status,
          ...(status === "IN_PROGRESS" && !ticket.startedAt ? { startedAt: new Date() } : {}),
        },
      });

      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "STATUS_CHANGED",
          oldValue: ticket.status,
          newValue: status,
          metadata: JSON.stringify({ actor: "Speda AI Assistant" }),
        },
      });

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
          id: ticket.organization.id,
          name: ticket.organization.name,
          slug: ticket.organization.slug,
        },
        requester: {
          id: ticket.createdBy.id,
          name: ticket.createdBy.fullName,
          email: ticket.createdBy.email,
        },
        created_at: updated.createdAt.toISOString(),
        updated_at: updated.updatedAt.toISOString(),
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    if (action === "add_comment" && content) {
      const comment = await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          type: "SPEDA_EVENT",
          content: content.trim(),
          isInternal: false,
        },
      });

      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "COMMENT_ADDED",
          metadata: JSON.stringify({ source: "Speda" }),
        },
      });

      return NextResponse.json({ success: true, comment });
    }

    if (action === "complete_ticket" && completion_summary) {
      const completed = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "COMPLETED",
          completionSummary: completion_summary.trim(),
          completionUrl: completion_url?.trim() || null,
          completedAt: new Date(),
        },
      });

      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "COMPLETED",
          oldValue: ticket.status,
          newValue: "COMPLETED",
          metadata: JSON.stringify({
            summary: completion_summary.trim(),
            actor: "Speda",
          }),
        },
      });

      return NextResponse.json({ success: true, ticket: completed });
    }

    if (action === "delete_ticket") {
      const fullTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: { attachments: true, organization: true },
      });

      const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
      if (fullTicket?.attachments) {
        for (const att of fullTicket.attachments) {
          if (att.storageKey) {
            try {
              const filename = path.basename(att.storageKey);
              const filePath = path.join(uploadsDir, filename);
              await fs.unlink(filePath).catch(() => {});
            } catch {
              // Ignore disk cleanup errors
            }
          }
        }
      }

      await prisma.ticket.delete({
        where: { id: ticket.id },
      });

      dispatchWebhookEvent("ticket.deleted", {
        id: ticket.id,
        ticket_number: ticket.ticketNumber,
        public_id: `#${ticket.ticketNumber}`,
        title: ticket.title,
        organization: {
          id: ticket.organization.id,
          name: ticket.organization.name,
          slug: ticket.organization.slug,
        },
        deleted_by: {
          actor: "Speda Service",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Ticket #${ticket.ticketNumber} deleted successfully.`,
      });
    }

    return NextResponse.json({ error: "Unknown action or missing parameters" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
