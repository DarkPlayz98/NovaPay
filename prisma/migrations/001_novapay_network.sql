-- NovaPay Network schema migration.
-- Non-destructive: adds new NovaPay fields/tables without resetting existing data.
-- Apply once to the production PostgreSQL database.
-- Legacy provider columns are intentionally left in place for safe historical-data migration.

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "refundRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "networkIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "networkReference" TEXT,
  ADD COLUMN IF NOT EXISTS "networkSignature" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_networkIntentId_key"
  ON "Payment"("networkIntentId");

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_networkReference_key"
  ON "Payment"("networkReference");

CREATE TABLE IF NOT EXISTS "NetworkParticipant" (
  "id" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "publicKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NetworkParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NetworkParticipant_nodeId_key"
  ON "NetworkParticipant"("nodeId");

CREATE TABLE IF NOT EXISTS "LedgerAccount" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "paymentId" TEXT,
  "direction" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "reference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LedgerEntry_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LedgerEntry_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LedgerEntry_accountId_createdAt_idx"
  ON "LedgerEntry"("accountId", "createdAt");

CREATE INDEX IF NOT EXISTS "LedgerEntry_paymentId_idx"
  ON "LedgerEntry"("paymentId");
