import crypto from "crypto";
import { prisma } from "./db";

export type WebhookEventType =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.comment.created"
  | "ticket.status.changed"
  | "ticket.priority.changed"
  | "ticket.completed"
  | "ticket.reopened";

export interface TicketWebhookPayload {
  id: string;
  ticket_number: number;
  public_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  requester: {
    id: string;
    name: string;
    email: string;
  };
  assigned_to?: {
    id: string;
    name: string;
  } | null;
  target_date?: string | null;
  waiting_reason?: string | null;
  completion_summary?: string | null;
  created_at: string;
  updated_at: string;
}

export async function dispatchWebhookEvent(
  eventType: WebhookEventType,
  ticketData: TicketWebhookPayload,
  extra?: Record<string, unknown>
): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { isActive: true },
    });

    if (endpoints.length === 0) return;

    const eventId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    const bodyObj = {
      event: eventType,
      event_id: eventId,
      timestamp,
      ticket: ticketData,
      ...extra,
    };

    const rawBody = JSON.stringify(bodyObj);

    for (const endpoint of endpoints) {
      let subscribedEvents: string[] = [];
      try {
        subscribedEvents = JSON.parse(endpoint.eventsSubscribed);
      } catch {
        subscribedEvents = ["ticket.created", "ticket.status.changed", "ticket.completed", "ticket.reopened"];
      }

      if (!subscribedEvents.includes(eventType) && !subscribedEvents.includes("*")) {
        continue;
      }

      // Generate HMAC-SHA256 signature
      const signature = crypto
        .createHmac("sha256", endpoint.secret)
        .update(rawBody)
        .digest("hex");

      // Send asynchronously without blocking caller
      fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ONYX-Webhook/1.0",
          "X-ONYX-Event": eventType,
          "X-ONYX-Event-ID": eventId,
          "X-ONYX-Timestamp": timestamp.toString(),
          "X-ONYX-Signature": signature,
        },
        body: rawBody,
        signal: AbortSignal.timeout(5000), // 5s timeout
      })
        .then(async (res) => {
          const resText = await res.text().catch(() => "");
          await prisma.webhookDelivery.create({
            data: {
              endpointId: endpoint.id,
              eventType,
              payload: rawBody,
              statusCode: res.status,
              responseBody: resText.slice(0, 1000),
              success: res.ok,
              attempts: 1,
            },
          });
        })
        .catch(async (err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          await prisma.webhookDelivery.create({
            data: {
              endpointId: endpoint.id,
              eventType,
              payload: rawBody,
              statusCode: 0,
              responseBody: `Delivery failed: ${errorMessage}`,
              success: false,
              attempts: 1,
            },
          });
        });
    }
  } catch (err) {
    console.error("Failed to dispatch webhook event:", err);
  }
}
