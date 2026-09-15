import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { SessionUser, UserRole } from "./permissions";

const SESSION_COOKIE_NAME = "onyx_session";
const SESSION_EXPIRY_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      await prisma.session.deleteMany({
        where: { token },
      });
    } catch {
      // Ignore if already deleted
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return getUserBySessionToken(token);
}

export async function getUserBySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return null;
    }

    if (!session.user.isActive) return null;

    return {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      fullName: session.user.fullName,
      role: session.user.role as UserRole,
      avatarUrl: session.user.avatarUrl,
      organizationIds: session.user.memberships.map((m) => m.organizationId),
    };
  } catch (err) {
    console.error("Error getting session user:", err);
    return null;
  }
}

export async function getUserByBearerToken(token: string): Promise<SessionUser | null> {
  try {
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!apiToken) return null;

    // Update last used timestamp
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      id: `service-${apiToken.id}`,
      email: "service@onyx.internal",
      username: apiToken.name,
      fullName: `Service (${apiToken.name})`,
      role: "SERVICE",
      avatarUrl: null,
      organizationIds: [],
    };
  } catch (err) {
    console.error("Error verifying bearer token:", err);
    return null;
  }
}
