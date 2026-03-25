-- AlterTable
ALTER TABLE "IntegrationConfig" ADD COLUMN "encryptedClientId" TEXT;
ALTER TABLE "IntegrationConfig" ADD COLUMN "encryptedClientSecret" TEXT;
ALTER TABLE "IntegrationConfig" ADD COLUMN "environment" TEXT;
