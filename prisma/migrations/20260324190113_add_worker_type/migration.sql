-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "workerType" TEXT NOT NULL DEFAULT 'employee',
    "status" TEXT NOT NULL DEFAULT 'active',
    "hireDate" DATETIME,
    "terminatedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Employee" ("createdAt", "email", "firstName", "hireDate", "id", "lastName", "notes", "phone", "status", "terminatedAt", "updatedAt") SELECT "createdAt", "email", "firstName", "hireDate", "id", "lastName", "notes", "phone", "status", "terminatedAt", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE INDEX "Employee_email_idx" ON "Employee"("email");
CREATE INDEX "Employee_status_idx" ON "Employee"("status");
CREATE TABLE "new_Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "emailHint" TEXT,
    "nameHint" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "employeeId" TEXT,
    "workerType" TEXT NOT NULL DEFAULT 'employee',
    "isRenewal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invite" ("createdAt", "emailHint", "employeeId", "expiresAt", "id", "isRenewal", "nameHint", "token", "usedAt") SELECT "createdAt", "emailHint", "employeeId", "expiresAt", "id", "isRenewal", "nameHint", "token", "usedAt" FROM "Invite";
DROP TABLE "Invite";
ALTER TABLE "new_Invite" RENAME TO "Invite";
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "Invite_token_idx" ON "Invite"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
