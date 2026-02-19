-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 100;

-- Ensure existing records have stock baseline
UPDATE "Product" SET "stock" = 100 WHERE "stock" IS NULL OR "stock" < 0;
