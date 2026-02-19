import { Prisma } from "@prisma/client";

export function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}
