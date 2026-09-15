import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { id } = await params;
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint) {
      return NextResponse.json({ error: "Webhook adresi bulunamadı" }, { status: 404 });
    }

    const eventId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const testPayload = {
      event: "test.ping",
      event_id: eventId,
      timestamp,
      message: "ONYX Speda Webhook Test Ping",
      triggered_by: user.fullName,
    };

    const rawBody = JSON.stringify(testPayload);
    const signature = crypto
      .createHmac("sha256", endpoint.secret)
      .update(rawBody)
      .digest("hex");

    let statusCode = 0;
    let responseBody = "";
    let success = false;

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ONYX-Webhook/1.0",
          "X-ONYX-Event": "test.ping",
          "X-ONYX-Event-ID": eventId,
          "X-ONYX-Timestamp": timestamp.toString(),
          "X-ONYX-Signature": signature,
        },
        body: rawBody,
        signal: AbortSignal.timeout(5000),
      });

      statusCode = res.status;
      responseBody = await res.text().catch(() => "");
      success = res.ok;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      responseBody = `Bağlantı hatası: ${msg}`;
    }

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventType: "test.ping",
        payload: rawBody,
        statusCode,
        responseBody: responseBody.slice(0, 1000),
        success,
        attempts: 1,
      },
    });

    return NextResponse.json({
      success,
      statusCode,
      responseBody,
      deliveryId: delivery.id,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
