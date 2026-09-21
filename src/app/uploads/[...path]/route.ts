import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { prisma } from "@/lib/db";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Dosya yolu belirtilmedi.", { status: 400 });
    }

    // Decode and sanitize to prevent directory traversal
    const rawSegments = pathSegments.map((s) => decodeURIComponent(s));
    const normalizedRelative = path
      .normalize(rawSegments.join(path.sep))
      .replace(/^(\.\.[\/\\])+/, "");
    const filename = path.basename(normalizedRelative);

    if (normalizedRelative.includes("..") || !filename) {
      return new NextResponse("Geçersiz dosya yolu.", { status: 400 });
    }

    // Search candidate directories where uploads might be stored
    const candidateDirs = [
      process.env.UPLOADS_DIR,
      path.join(process.cwd(), "public", "uploads"),
      path.join(process.cwd(), "uploads"),
      path.join(process.cwd(), ".next", "standalone", "public", "uploads"),
    ].filter(Boolean) as string[];

    let targetFilePath: string | null = null;
    let fileStat: any = null;

    for (const dir of candidateDirs) {
      // 1. Try full relative path
      const p1 = path.join(dir, normalizedRelative);
      try {
        const s = await fs.stat(p1);
        if (s.isFile()) {
          targetFilePath = p1;
          fileStat = s;
          break;
        }
      } catch {
        // continue
      }

      // 2. Try just filename in candidate dir
      const p2 = path.join(dir, filename);
      try {
        const s = await fs.stat(p2);
        if (s.isFile()) {
          targetFilePath = p2;
          fileStat = s;
          break;
        }
      } catch {
        // continue
      }
    }

    if (!targetFilePath || !fileStat) {
      return new NextResponse("Dosya bulunamadı.", { status: 404 });
    }

    // Look up attachment info from DB if possible to get original filename and mimeType
    let mimeType: string | null = null;
    let originalFilename: string = filename;

    try {
      const dbAttachment = await prisma.attachment.findFirst({
        where: {
          OR: [
            { storageKey: `/uploads/${filename}` },
            { storageKey: { endsWith: filename } },
          ],
        },
        select: {
          filename: true,
          mimeType: true,
        },
      });

      if (dbAttachment) {
        if (dbAttachment.mimeType) mimeType = dbAttachment.mimeType;
        if (dbAttachment.filename) originalFilename = dbAttachment.filename;
      }
    } catch {
      // Prisma error fallback, continue with extension detection
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = mimeType || MIME_TYPES[ext] || "application/octet-stream";

    const isImage = contentType.startsWith("image/");
    const isPdf = contentType === "application/pdf";
    const isVideo = contentType.startsWith("video/");
    const isAudio = contentType.startsWith("audio/");

    const isDownload = req.nextUrl.searchParams.has("download");
    const disposition =
      isDownload || (!isImage && !isPdf && !isVideo && !isAudio)
        ? "attachment"
        : "inline";

    const encodedFilename = encodeURIComponent(originalFilename);

    const nodeStream = createReadStream(targetFilePath);
    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": `${disposition}; filename="${originalFilename.replace(
          /"/g,
          '\\"'
        )}"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("Uploads serve error:", errorMsg);
    return new NextResponse("Dosya sunulurken hata oluştu: " + errorMsg, { status: 500 });
  }
}
