import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const organizationId = searchParams.get("organizationId");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // Base access filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (user.role === "USER") {
      where.createdById = user.id;
    } else if (user.role === "MANAGER") {
      where.organizationId = { in: user.organizationIds };
    }
    // ADMIN sees all

    // Additional query filters
    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (status) {
      if (status === "ACTIVE") {
        where.status = { in: ["OPEN", "IN_PROGRESS", "WAITING"] };
      } else {
        where.status = status;
      }
    }

    if (priority) {
      where.priority = priority;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      const searchNum = parseInt(search.replace("#", ""), 10);
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        ...(isNaN(searchNum) ? [] : [{ ticketNumber: searchNum }]),
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("GET tickets error:", err);
    return NextResponse.json(
      { error: "Talepler yüklenirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      organizationId,
      category = "Other",
      priority = "NORMAL",
      targetDate,
      attachmentIds = [],
    } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "Başlık ve talep açıklaması zorunludur." },
        { status: 400 }
      );
    }

    // Determine target organization
    let targetOrgId = organizationId;
    if (!targetOrgId) {
      if (user.organizationIds.length > 0) {
        targetOrgId = user.organizationIds[0];
      } else {
        const defaultOrg = await prisma.organization.findFirst();
        if (!defaultOrg) {
          return NextResponse.json({ error: "Kayıtlı şirket bulunamadı." }, { status: 400 });
        }
        targetOrgId = defaultOrg.id;
      }
    }

    // Priority check: only ADMIN can assign URGENT directly
    let finalPriority = priority;
    if (user.role !== "ADMIN" && priority === "URGENT") {
      finalPriority = "HIGH"; // Demote to High for non-admins per design doc section 7
    }

    // Calculate sequential ticketNumber starting at 1001
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });
    const nextTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1001;

    // Create ticket in transaction
    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          ticketNumber: nextTicketNumber,
          organizationId: targetOrgId,
          createdById: user.id,
          title: title.trim(),
          description: description.trim(),
          status: "OPEN",
          priority: finalPriority,
          category,
          targetDate: targetDate ? new Date(targetDate) : null,
        },
        include: {
          organization: true,
          createdBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      });

      // Link attachments
      if (attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: attachmentIds } },
          data: { ticketId: created.id },
        });
      }

      // Log immutable creation event
      await tx.ticketEvent.create({
        data: {
          ticketId: created.id,
          actorId: user.id,
          eventType: "CREATED",
          newValue: "OPEN",
          metadata: JSON.stringify({
            title: created.title,
            priority: created.priority,
            category: created.category,
          }),
        },
      });

      return created;
    });

    // Dispatch webhook for Speda
    dispatchWebhookEvent("ticket.created", {
      id: ticket.id,
      ticket_number: ticket.ticketNumber,
      public_id: `#${ticket.ticketNumber}`,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
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
      target_date: ticket.targetDate?.toISOString() || null,
      created_at: ticket.createdAt.toISOString(),
      updated_at: ticket.updatedAt.toISOString(),
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("POST ticket error:", err);
    return NextResponse.json(
      { error: "Talep oluşturulurken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
