import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { hasStoreAccess } from "@/lib/api-auth";

describe("hasStoreAccess", () => {
  it("allows ADMIN to access any store", () => {
    const canAccess = hasStoreAccess(
      { role: Role.ADMIN, defaultStoreId: "store-a" },
      "store-b",
    );
    expect(canAccess).toBe(true);
  });

  it("allows non-admin only when store equals defaultStoreId", () => {
    expect(
      hasStoreAccess({ role: Role.MANAGER, defaultStoreId: "store-a" }, "store-a"),
    ).toBe(true);
    expect(
      hasStoreAccess({ role: Role.CASHIER, defaultStoreId: "store-a" }, "store-b"),
    ).toBe(false);
  });

  it("denies when role or store is missing", () => {
    expect(hasStoreAccess(undefined, "store-a")).toBe(false);
    expect(hasStoreAccess({ role: Role.BARISTA, defaultStoreId: "store-a" }, "")).toBe(false);
  });
});
