import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim. Sadece yöneticiler kullanıcıları yönetebilir." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const role = searchParams.get("role");
    const organizationId = searchParams.get("organizationId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (role && ["ADMIN", "MANAGER", "USER", "SERVICE"].includes(role)) {
      where.role = role;
    }

    if (organizationId) {
      where.memberships = {
        some: { organizationId },
      };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
            comments: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Kullanıcılar listelenirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim. Sadece yöneticiler kullanıcı ekleyebilir." }, { status: 403 });
    }

    const body = await req.json();
    const {
      email,
      username,
      fullName,
      password,
      role = "USER",
      organizationIds = [],
      isActive = true,
    } = body;

    if (!email?.trim() || !username?.trim() || !fullName?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "E-posta, kullanıcı adı, ad soyad ve şifre zorunludur." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    // Check unique constraints
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { username: cleanUsername }],
      },
    });

    if (existing) {
      if (existing.email.toLowerCase() === cleanEmail) {
        return NextResponse.json({ error: "Bu e-posta adresi zaten kullanımda." }, { status: 400 });
      }
      return NextResponse.json({ error: "Bu kullanıcı adı zaten kullanımda." }, { status: 400 });
    }

    const validRoles = ["USER", "MANAGER", "ADMIN", "SERVICE"];
    const targetRole = validRoles.includes(role) ? role : "USER";

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: cleanEmail,
          username: cleanUsername,
          fullName: fullName.trim(),
          passwordHash,
          role: targetRole,
          isActive: Boolean(isActive),
        },
      });

      if (Array.isArray(organizationIds) && organizationIds.length > 0) {
        await tx.organizationMember.createMany({
          data: organizationIds.map((orgId: string) => ({
            userId: created.id,
            organizationId: orgId,
            role: targetRole === "ADMIN" ? "OWNER" : targetRole === "MANAGER" ? "LEAD" : "MEMBER",
          })),
        });
      }

      return tx.user.findUnique({
        where: { id: created.id },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          memberships: {
            select: {
              id: true,
              role: true,
              organization: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Kullanıcı oluşturulurken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
