import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ONYX database...");

  // Clean existing data
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticketEvent.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create Organizations
  const arelTarim = await prisma.organization.create({
    data: {
      name: "Arel Tarım",
      slug: "arel-tarim",
    },
  });

  const karaMakine = await prisma.organization.create({
    data: {
      name: "Kara Makine",
      slug: "kara-makine",
    },
  });

  console.log("Created organizations:", arelTarim.name, karaMakine.name);

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const userPasswordHash = await bcrypt.hash("user123", 10);

  // Create Users
  const ahmet = await prisma.user.create({
    data: {
      email: "ahmet@arel.com",
      username: "ahmet",
      fullName: "Ahmet Erol Bayrak",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const sinan = await prisma.user.create({
    data: {
      email: "sinan@karamakine.com",
      username: "sinan",
      fullName: "Sinan Kara",
      passwordHash: userPasswordHash,
      role: "MANAGER",
    },
  });

  const zeynep = await prisma.user.create({
    data: {
      email: "zeynep@karamakine.com",
      username: "zeynep",
      fullName: "Zeynep Kara",
      passwordHash: userPasswordHash,
      role: "USER",
    },
  });

  const kaan = await prisma.user.create({
    data: {
      email: "kaan@arel.com",
      username: "kaan",
      fullName: "Kaan Yılmaz",
      passwordHash: userPasswordHash,
      role: "USER",
    },
  });

  const osman = await prisma.user.create({
    data: {
      email: "osman@arel.com",
      username: "osman",
      fullName: "Osman Bayrak",
      passwordHash: userPasswordHash,
      role: "USER",
    },
  });

  console.log("Created users: Ahmet (ADMIN), Sinan (MANAGER), Zeynep (USER), Kaan (USER), Osman (USER)");

  // Memberships
  await prisma.organizationMember.createMany({
    data: [
      { userId: ahmet.id, organizationId: arelTarim.id, role: "OWNER" },
      { userId: ahmet.id, organizationId: karaMakine.id, role: "OWNER" },
      { userId: sinan.id, organizationId: karaMakine.id, role: "LEAD" },
      { userId: zeynep.id, organizationId: karaMakine.id, role: "MEMBER" },
      { userId: kaan.id, organizationId: arelTarim.id, role: "MEMBER" },
      { userId: osman.id, organizationId: arelTarim.id, role: "MEMBER" },
    ],
  });

  // Create Speda API Token
  const spedaTokenRaw = "speda-service-token-2026";
  const spedaTokenHash = crypto.createHash("sha256").update(spedaTokenRaw).digest("hex");
  await prisma.apiToken.create({
    data: {
      name: "Speda Mark VI Assistant",
      tokenHash: spedaTokenHash,
      role: "SERVICE",
      permissions: JSON.stringify(["tickets:read", "tickets:update", "comments:create", "tickets:complete"]),
    },
  });

  // Create Webhook Endpoint for Speda
  await prisma.webhookEndpoint.create({
    data: {
      url: "http://localhost:8000/api/v1/onyx/webhook",
      secret: "onyx_speda_webhook_secret_key_2026",
      description: "Speda Mark VI Integration Webhook",
      isActive: true,
      eventsSubscribed: JSON.stringify([
        "ticket.created",
        "ticket.status.changed",
        "ticket.comment.created",
        "ticket.completed",
        "ticket.reopened",
      ]),
    },
  });

  // Sample Ticket 1: OPEN
  const t1 = await prisma.ticket.create({
    data: {
      ticketNumber: 1001,
      organizationId: karaMakine.id,
      createdById: sinan.id,
      title: "Instagram için yeni çapa makinesi tanıtım postu",
      description: "Yeni gelen 7 HP benzinli çapa makinesi için Instagram kare ve hikaye formatında görsel hazırlanmasını rica ediyoruz. Ürün görselleri yakında WhatsApp yerine buradan iletilecektir.",
      status: "OPEN",
      priority: "NORMAL",
      category: "Social Media",
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: t1.id,
      actorId: sinan.id,
      eventType: "CREATED",
      newValue: "OPEN",
      metadata: JSON.stringify({ title: t1.title }),
    },
  });

  // Sample Ticket 2: IN_PROGRESS
  const t2 = await prisma.ticket.create({
    data: {
      ticketNumber: 1002,
      organizationId: karaMakine.id,
      createdById: zeynep.id,
      assignedToId: ahmet.id,
      title: "Kara Makine e-ticaret sitesine yeni ürün grubu eklenmesi",
      description: "Traktör arkası ilaçlama makineleri kategorisi açılıp 4 adet yeni modelin teknik özellikleri ve fiyatları siteye girilecek.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      category: "E-Commerce",
      startedAt: new Date(Date.now() - 3600000 * 4),
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: t2.id,
      actorId: zeynep.id,
      eventType: "CREATED",
      newValue: "OPEN",
      metadata: JSON.stringify({ title: t2.title }),
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: t2.id,
      actorId: ahmet.id,
      eventType: "STATUS_CHANGED",
      oldValue: "OPEN",
      newValue: "IN_PROGRESS",
    },
  });

  await prisma.ticketComment.create({
    data: {
      ticketId: t2.id,
      userId: ahmet.id,
      type: "ADMIN_MESSAGE",
      content: "Kategori ağacı oluşturuldu, ürün açıklamaları düzenleniyor.",
    },
  });

  await prisma.ticketComment.create({
    data: {
      ticketId: t2.id,
      userId: ahmet.id,
      type: "INTERNAL_NOTE",
      content: "İlaçlama pompalarının debi bilgileri katalog ile uyuşmuyor, üretici teyidi bekleniyor.",
      isInternal: true,
    },
  });

  // Sample Ticket 3: WAITING
  const t3 = await prisma.ticket.create({
    data: {
      ticketNumber: 1003,
      organizationId: arelTarim.id,
      createdById: kaan.id,
      assignedToId: ahmet.id,
      title: "2026 Güz Tohum Kataloğu fiyat güncellemesi",
      description: "Baskıya gidecek PDF katalogdaki buğday ve arpa tohumu fiyatlarının yeni tarife listesine göre güncellenmesi.",
      status: "WAITING",
      priority: "NORMAL",
      category: "Catalog / Product",
      waitingReason: "Arel Tarım 2026 güz resmi fiyat listesi bekleniyor.",
      startedAt: new Date(Date.now() - 3600000 * 24),
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: t3.id,
      actorId: kaan.id,
      eventType: "CREATED",
      newValue: "OPEN",
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: t3.id,
      actorId: ahmet.id,
      eventType: "STATUS_CHANGED",
      oldValue: "IN_PROGRESS",
      newValue: "WAITING",
      metadata: JSON.stringify({ reason: "Arel Tarım 2026 güz resmi fiyat listesi bekleniyor." }),
    },
  });

  // Sample Ticket 4: COMPLETED
  const t4 = await prisma.ticket.create({
    data: {
      ticketNumber: 1004,
      organizationId: karaMakine.id,
      createdById: sinan.id,
      assignedToId: ahmet.id,
      title: "Google Ads arama kampanyası negatif kelime optimizasyonu",
      description: "Gereksiz arama terimlerinin filtrelenerek bütçe israfının engellenmesi.",
      status: "COMPLETED",
      priority: "HIGH",
      category: "Advertising",
      startedAt: new Date(Date.now() - 3600000 * 48),
      completedAt: new Date(Date.now() - 3600000 * 2),
      completionSummary: "Arama terimleri raporu incelendi, 47 adet alakasız anahtar kelime negatif listeye eklendi ve bütçe verimliliği sağlandı.",
      completionUrl: "https://ads.google.com",
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: t4.id,
      actorId: ahmet.id,
      eventType: "COMPLETED",
      newValue: "COMPLETED",
      metadata: JSON.stringify({ summary: t4.completionSummary }),
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
