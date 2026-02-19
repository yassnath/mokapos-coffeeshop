import { createHash } from "node:crypto";

export function buildOrderNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const seed = `${now.toISOString()}-${Math.random()}`;
  const randomPart = createHash("sha256").update(seed).digest("hex").slice(0, 4).toUpperCase();
  return `SVX-${datePart}-${randomPart}`;
}
