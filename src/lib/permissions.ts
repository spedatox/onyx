export type UserRole = "USER" | "MANAGER" | "ADMIN" | "SERVICE";

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string | null;
  organizationIds: string[];
}

export function canViewTicket(user: SessionUser, ticket: { createdById: string; organizationId: string }): boolean {
  if (user.role === "ADMIN" || user.role === "SERVICE") return true;
  if (user.role === "MANAGER") {
    return user.organizationIds.includes(ticket.organizationId);
  }
  // USER can only view own tickets
  return ticket.createdById === user.id;
}

export function canCommentOnTicket(user: SessionUser, ticket: { createdById: string; organizationId: string }): boolean {
  if (user.role === "ADMIN" || user.role === "SERVICE") return true;
  if (user.role === "MANAGER") {
    return user.organizationIds.includes(ticket.organizationId);
  }
  return ticket.createdById === user.id;
}

export function canViewInternalNotes(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "SERVICE";
}

export function canManageTicket(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "SERVICE";
}

export function canChangePriority(user: SessionUser): boolean {
  return user.role === "ADMIN";
}

export function canAccessAdmin(user: SessionUser): boolean {
  return user.role === "ADMIN";
}
