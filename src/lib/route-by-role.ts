import { Role } from "@prisma/client";

export function routeForRole(role: Role) {
  if (role === "BARISTA") return "/kds";
  if (role === "CASHIER") return "/pos";
  if (role === "MANAGER" || role === "ADMIN") return "/admin";
  return "/pos";
}
