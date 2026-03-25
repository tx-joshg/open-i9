-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PortalConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'My Company',
    "logoFileKey" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "notificationEmails" TEXT NOT NULL DEFAULT '[]',
    "footerText" TEXT NOT NULL DEFAULT '',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "sendEmployeeConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "useEVerify" BOOLEAN NOT NULL DEFAULT false,
    "inviteLinkExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PortalConfig" ("accentColor", "businessName", "footerText", "id", "inviteLinkExpiryDays", "logoFileKey", "notificationEmails", "primaryColor", "sendEmployeeConfirmation", "updatedAt", "welcomeMessage") SELECT "accentColor", "businessName", "footerText", "id", "inviteLinkExpiryDays", "logoFileKey", "notificationEmails", "primaryColor", "sendEmployeeConfirmation", "updatedAt", "welcomeMessage" FROM "PortalConfig";
DROP TABLE "PortalConfig";
ALTER TABLE "new_PortalConfig" RENAME TO "PortalConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
