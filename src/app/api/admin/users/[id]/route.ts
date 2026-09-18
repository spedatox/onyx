import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
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
            organizationId: true,
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

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("GET user error:", err);
    return NextResponse.json(
      { error: "Kullanıcı bilgisi alınırken hata: " + errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      email,
      username,
      fullName,
      password,
      role,
      isActive,
      organizationIds,
    } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Güncellenecek kullanıcı bulunamadı." }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (email !== undefined) {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail) {
        return NextResponse.json({ error: "E-posta boş bırakılamaz." }, { status: 400 });
      }
      if (cleanEmail !== existingUser.email) {
        const conflict = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (conflict) {
          return NextResponse.json({ error: "Bu e-posta başka bir kullanıcı tarafından kullanılıyor." }, { status: 400 });
        }
      }
      updateData.email = cleanEmail;
    }

    if (username !== undefined) {
      const cleanUsername = username.toLowerCase().trim();
      if (!cleanUsername) {
        return NextResponse.json({ error: "Kullanıcı adı boş bırakılamaz." }, { status: 400 });
      }
      if (cleanUsername !== existingUser.username) {
        const conflict = await prisma.user.findUnique({ where: { username: cleanUsername } });
        if (conflict) {
          return NextResponse.json({ error: "Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor." }, { status: 400 });
        }
      }
      updateData.username = cleanUsername;
    }

    if (fullName !== undefined) {
      const cleanName = fullName.trim();
      if (!cleanName) {
        return NextResponse.json({ error: "Ad Soyad boş bırakılamaz." }, { status: 400 });
      }
      updateData.fullName = cleanName;
    }

    if (role !== undefined) {
      const validRoles = ["USER", "MANAGER", "ADMIN", "SERVICE"];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 });
      }
      // Prevent demoting self from ADMIN if current user
      if (id === currentUser.id && role !== "ADMIN") {
        return NextResponse.json({ error: "Kendi yönetici rolünüzü düşüremezsiniz." }, { status: 400 });
      }
      updateData.role = role;
    }

    if (isActive !== undefined) {
      // Prevent deactivating self
      if (id === currentUser.id && isActive === false) {
        return NextResponse.json({ error: "Kendi hesabınızı devre dışı bırakamazsınız." }, { status: 400 });
      }
      updateData.isActive = Boolean(isActive);
    }

    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır." }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: updateData,
      });

      if (Array.isArray(organizationIds)) {
        // Delete existing memberships and replace
        await tx.organizationMember.deleteMany({
          where: { userId: id },
        });

        if (organizationIds.length > 0) {
          const targetRole = updateData.role || existingUser.role;
          await tx.organizationMember.createMany({
            data: organizationIds.map((orgId: string) => ({
              userId: id,
              organizationId: orgId,
              role: targetRole === "ADMIN" ? "OWNER" : targetRole === "MANAGER" ? "LEAD" : "MEMBER",
            })),
          });
        }
      }

      // If user was deactivated or password changed, terminate their active sessions
      if (updateData.isActive === false || updateData.passwordHash) {
        await tx.session.deleteMany({
          where: { userId: id },
        });
      }

      return tx.user.findUnique({
        where: { id },
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
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("PUT user error:", err);
    return NextResponse.json(
      { error: "Kullanıcı güncellenirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { id } = await params;

    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "Kendi yönetici hesabınızı silemezsiniz." },
        { status: 400 }
      );
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
            uploadedAttachments: true,
          },
        },
      },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    // If user has created tickets or assigned tickets, check query parameter ?force=true
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const hasCreatedTickets = userToDelete._count.createdTickets > 0;

    if (hasCreatedTickets && !force) {
      // Return warning and suggest soft-delete / deactivate instead
      return NextResponse.json({
        error: `Bu kullanıcının oluşturduğu ${userToDelete._count.createdTickets} adet talep bulunmaktadır. Güvenlik ve veri bütünlüğü için hesabı pasife alabilir veya zorla silmek için reassign onaylayabilirsiniz.`,
        requiresConfirmation: true,
        ticketCount: userToDelete._count.createdTickets,
      }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      // Reassign or orphan tickets if any
      if (userToDelete._count.assignedTickets > 0) {
        await tx.ticket.updateMany({
          where: { assignedToId: id },
          data: { assignedToId: null },
        });
      }

      if (hasCreatedTickets && force) {
        // Transfer created tickets to the deleting admin to preserve ticket history
        await tx.ticket.updateMany({
          where: { createdById: id },
          data: { createdById: currentUser.id },
        });

        await tx.attachment.updateMany({
          where: { uploadedById: id },
          data: { uploadedById: currentUser.id },
        });
      }

      // Delete user sessions and memberships
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.organizationMember.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: "Kullanıcı başarıyla silindi." });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("DELETE user error:", err);
    return NextResponse.json(
      { error: "Kullanıcı silinirken hata oluştu: " + errorMessage },
      { status: 500 }
    );
  }
}
