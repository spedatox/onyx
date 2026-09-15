import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  // If ADMIN, return all organizations. Otherwise return user's organizations
  if (user.role === "ADMIN" || user.role === "SERVICE") {
    const orgs = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { tickets: true, members: true },
        },
      },
    });
    return NextResponse.json({ organizations: orgs });
  }

  const orgs = await prisma.organization.findMany({
    where: {
      members: {
        some: { userId: user.id },
      },
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { tickets: true, members: true },
      },
    },
  });

  return NextResponse.json({ organizations: orgs });
}
