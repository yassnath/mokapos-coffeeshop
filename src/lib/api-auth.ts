import { Role } from "@prisma/client";

import { auth } from "@/lib/session";

export async function getApiSession() {
  return auth();
}

export function isAllowed(role: Role | undefined, allowed: Role[]) {
  if (!role) return false;
  return allowed.includes(role);
}

export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return Response.json({ error: message }, { status: 403 });
}

type SessionLikeUser = {
  role?: Role;
  defaultStoreId?: string | null;
};

export function hasStoreAccess(user: SessionLikeUser | undefined, storeId: string | null | undefined) {
  if (!user?.role || !storeId) return false;
  if (user.role === Role.ADMIN) return true;
  return user.defaultStoreId === storeId;
}
