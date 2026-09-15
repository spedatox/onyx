import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const endpoints = await prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        deliveries: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const recentDeliveries = await prisma.webhookDelivery.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        endpoint: { select: { description: true, url: true } },
      },
    });

    return NextResponse.json({
      endpoints,
      recentDeliveries,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const body = await req.json();
    const { url, secret, description, isActive = true, eventsSubscribed } = body;

    if (!url || !secret) {
      return NextResponse.json({ error: "URL ve Webhook Secret zorunludur." }, { status: 400 });
    }

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        url: url.trim(),
        secret: secret.trim(),
        description: description?.trim() || "Speda Integration",
        isActive: Boolean(isActive),
        eventsSubscribed: JSON.stringify(
          eventsSubscribed || [
            "ticket.created",
            "ticket.status.changed",
            "ticket.comment.created",
            "ticket.completed",
            "ticket.reopened",
          ]
        ),
      },
    });

    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
