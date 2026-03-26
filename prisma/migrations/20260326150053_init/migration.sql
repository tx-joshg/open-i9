-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "sessionToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'My Company',
    "logoFileKey" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "notificationEmails" TEXT NOT NULL DEFAULT '[]',
    "footerText" TEXT NOT NULL DEFAULT '',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "sendEmployeeConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "useEVerify" BOOLEAN,
    "inviteLinkExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "employerName" TEXT NOT NULL DEFAULT '',
    "employerTitle" TEXT NOT NULL DEFAULT '',
    "employerBusinessName" TEXT NOT NULL DEFAULT '',
    "employerBusinessAddress" TEXT NOT NULL DEFAULT '',
    "i9FormFileKey" TEXT,
    "i9FieldMapping" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "defaultRecordType" TEXT NOT NULL DEFAULT 'employee',
    "encryptedClientId" TEXT,
    "encryptedClientSecret" TEXT,
    "environment" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "realmId" TEXT,
    "accountId" TEXT,
    "connectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "emailHint" TEXT,
    "nameHint" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "employeeId" TEXT,
    "workerType" TEXT NOT NULL DEFAULT 'employee',
    "isRenewal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "workerType" TEXT NOT NULL DEFAULT 'employee',
    "status" TEXT NOT NULL DEFAULT 'active',
    "hireDate" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "encryptedSsn" TEXT,
    "encryptedSsnLast4" TEXT,
    "encryptedEmail" TEXT NOT NULL,
    "encryptedPhone" TEXT,
    "citizenshipStatus" TEXT NOT NULL,
    "encryptedAlienRegNumber" TEXT,
    "encryptedI94Number" TEXT,
    "encryptedForeignPassport" TEXT,
    "passportCountry" TEXT,
    "authExpDate" TIMESTAMP(3),
    "encryptedSignatureDataUrl" TEXT,
    "signatureDate" TIMESTAMP(3) NOT NULL,
    "docChoice" TEXT NOT NULL,
    "listADoc" TEXT,
    "listADocNumber" TEXT,
    "listAExpDate" TIMESTAMP(3),
    "listAFileKey" TEXT,
    "listAIssuingAuthority" TEXT,
    "listBDoc" TEXT,
    "listBDocNumber" TEXT,
    "listBExpDate" TIMESTAMP(3),
    "listBFileKey" TEXT,
    "listBIssuingAuthority" TEXT,
    "listCDoc" TEXT,
    "listCDocNumber" TEXT,
    "listCExpDate" TIMESTAMP(3),
    "listCFileKey" TEXT,
    "listCIssuingAuthority" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "adminNotes" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "nextRenewalDate" TIMESTAMP(3),
    "qbRecordId" TEXT,
    "qbRecordType" TEXT,
    "qbSyncStatus" TEXT,
    "qbSyncedAt" TIMESTAMP(3),
    "qbSyncError" TEXT,
    "xeroRecordId" TEXT,
    "xeroRecordType" TEXT,
    "xeroSyncStatus" TEXT,
    "xeroSyncedAt" TIMESTAMP(3),
    "xeroSyncError" TEXT,
    "zohoRecordId" TEXT,
    "zohoRecordType" TEXT,
    "zohoSyncStatus" TEXT,
    "zohoSyncedAt" TIMESTAMP(3),
    "zohoSyncError" TEXT,
    "fbRecordId" TEXT,
    "fbRecordType" TEXT,
    "fbSyncStatus" TEXT,
    "fbSyncedAt" TIMESTAMP(3),
    "fbSyncError" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_sessionToken_key" ON "AdminUser"("sessionToken");

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

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
