-- CreateTable
CREATE TABLE "PortalConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'My Company',
    "logoFileKey" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "notificationEmails" TEXT NOT NULL DEFAULT '[]',
    "footerText" TEXT NOT NULL DEFAULT '',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "sendEmployeeConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "inviteLinkExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "defaultRecordType" TEXT NOT NULL DEFAULT 'employee',
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "realmId" TEXT,
    "accountId" TEXT,
    "connectedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "emailHint" TEXT,
    "nameHint" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "employeeId" TEXT,
    "isRenewal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "hireDate" DATETIME,
    "terminatedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "employeeId" TEXT,
    "isRenewal" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleInitial" TEXT,
    "otherLastNames" TEXT,
    "encryptedAddress" TEXT NOT NULL,
    "encryptedAptUnit" TEXT,
    "encryptedCity" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "encryptedZip" TEXT NOT NULL,
    "encryptedDob" TEXT NOT NULL,
    "encryptedSsnLast4" TEXT,
    "encryptedEmail" TEXT NOT NULL,
    "encryptedPhone" TEXT,
    "citizenshipStatus" TEXT NOT NULL,
    "encryptedAlienRegNumber" TEXT,
    "encryptedI94Number" TEXT,
    "encryptedForeignPassport" TEXT,
    "passportCountry" TEXT,
    "authExpDate" DATETIME,
    "signatureDate" DATETIME NOT NULL,
    "docChoice" TEXT NOT NULL,
    "listADoc" TEXT,
    "listADocNumber" TEXT,
    "listAExpDate" DATETIME,
    "listAFileKey" TEXT,
    "listBDoc" TEXT,
    "listBDocNumber" TEXT,
    "listBExpDate" DATETIME,
    "listBFileKey" TEXT,
    "listCDoc" TEXT,
    "listCDocNumber" TEXT,
    "listCExpDate" DATETIME,
    "listCFileKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "adminNotes" TEXT,
    "emailSentAt" DATETIME,
    "nextRenewalDate" DATETIME,
    "qbRecordId" TEXT,
    "qbRecordType" TEXT,
    "qbSyncStatus" TEXT,
    "qbSyncedAt" DATETIME,
    "qbSyncError" TEXT,
    "xeroRecordId" TEXT,
    "xeroRecordType" TEXT,
    "xeroSyncStatus" TEXT,
    "xeroSyncedAt" DATETIME,
    "xeroSyncError" TEXT,
    "zohoRecordId" TEXT,
    "zohoRecordType" TEXT,
    "zohoSyncStatus" TEXT,
    "zohoSyncedAt" DATETIME,
    "zohoSyncError" TEXT,
    "fbRecordId" TEXT,
    "fbRecordType" TEXT,
    "fbSyncStatus" TEXT,
    "fbSyncedAt" DATETIME,
    "fbSyncError" TEXT,
    CONSTRAINT "Submission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConfig_platform_key" ON "IntegrationConfig"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_token_idx" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Submission_employeeId_idx" ON "Submission"("employeeId");

-- CreateIndex
CREATE INDEX "Submission_nextRenewalDate_idx" ON "Submission"("nextRenewalDate");
