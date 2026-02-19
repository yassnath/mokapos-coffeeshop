-- Enforce baseline stock and cost pricing rule for cafe products
UPDATE "Product"
SET
  "stock" = 100,
  "costPrice" = GREATEST("basePrice" - 5000, 0);
