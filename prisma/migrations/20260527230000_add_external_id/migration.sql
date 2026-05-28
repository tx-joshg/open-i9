-- Add externalId to Invite + Employee for cross-system linking
-- (partner system's stable ID, e.g. NyTex staff-portal's "NTX-2053").

-- Invite: non-unique — admins may re-mint after expiry, both invites
-- carry the same partner ID and converge on the same Employee.
ALTER TABLE "Invite" ADD COLUMN "externalId" TEXT;
CREATE INDEX "Invite_externalId_idx" ON "Invite"("externalId");

-- Employee: sparse-unique — one Employee per externalId per install;
-- nulls allowed so open-i9 standalone (no partner system) still works.
ALTER TABLE "Employee" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "Employee_externalId_key" ON "Employee"("externalId");
