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
