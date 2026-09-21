import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_PREFIXES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
];

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ticketId = formData.get("ticketId") as string | null;
    const commentId = formData.get("commentId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Yüklenecek dosya seçilmedi." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Dosya boyutu çok büyük (Maksimum 50MB)." },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const storageKey = `upload-${uniqueSuffix}${ext}`;

    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storageKey);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    const attachment = await prisma.attachment.create({
      data: {
        ticketId: ticketId || null,
        commentId: commentId || null,
        filename: originalName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        storageKey: `/uploads/${storageKey}`,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return NextResponse.json({
      attachment: {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        url: attachment.storageKey,
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Dosya yüklenirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
