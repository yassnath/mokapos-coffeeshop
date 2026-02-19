import { Role } from "@prisma/client";

export const ROLE_ACCESS = {
  ADMIN: ["admin", "pos", "kds", "discount", "void_refund", "settings"],
  MANAGER: ["admin", "pos", "kds", "discount", "void_refund", "settings"],
  CASHIER: ["pos"],
  BARISTA: ["kds"],
} as const;

export type Permission = "admin" | "pos" | "kds" | "discount" | "void_refund" | "settings";

export function hasPermission(role: Role | undefined, permission: Permission) {
  if (!role) return false;
  return (ROLE_ACCESS[role] as readonly Permission[]).includes(permission);
}

export function hasAnyRole(role: Role | undefined, allowed: Role[]) {
  if (!role) return false;
  return allowed.includes(role);
}

export const discountRoles: Role[] = [Role.ADMIN, Role.MANAGER];
export const voidRefundRoles: Role[] = [Role.ADMIN, Role.MANAGER];
