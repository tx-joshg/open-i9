import { prisma } from "@/lib/db";
import { quickbooksAdapter } from "@/lib/integrations/quickbooks";
import { xeroAdapter } from "@/lib/integrations/xero";
import { zohoAdapter } from "@/lib/integrations/zoho";
import { freshbooksAdapter } from "@/lib/integrations/freshbooks";
import type {
  IntegrationAdapter,
  IntegrationPlatform,
  RecordType,
  SyncResult,
} from "@/lib/integrations/types";

/**
 * Registry of platform adapters. As new integrations are added,
 * register them here.
 */
const adapters: Partial<Record<IntegrationPlatform, IntegrationAdapter>> = {
  quickbooks: quickbooksAdapter,
  xero: xeroAdapter,
  zoho: zohoAdapter,
  freshbooks: freshbooksAdapter,
};

/** Maps platform name to the Prisma field prefix for sync columns. */
const platformFieldPrefix: Record<IntegrationPlatform, string> = {
  quickbooks: "qb",
  xero: "xero",
  zoho: "zoho",
  freshbooks: "fb",
};

interface PlatformSyncUpdate {
  [key: string]: string | Date | null;
}

function buildSyncUpdate(
  prefix: string,
  result: SyncResult,
  recordType: RecordType
): PlatformSyncUpdate {
  if (result.success) {
    return {
      [`${prefix}RecordId`]: result.recordId ?? null,
      [`${prefix}RecordType`]: recordType,
      [`${prefix}SyncStatus`]: "synced",
      [`${prefix}SyncedAt`]: new Date(),
      [`${prefix}SyncError`]: null,
    };
  }
  return {
    [`${prefix}RecordType`]: recordType,
    [`${prefix}SyncStatus`]: "failed",
    [`${prefix}SyncError`]: result.error?.slice(0, 500) ?? "Unknown error",
  };
}

/**
 * Syncs a submission to all connected integrations in parallel.
 * Catches errors per-platform so one failure does not block others.
 */
export async function syncToAllIntegrations(submissionId: string): Promise<void> {
  const connectedConfigs = await prisma.integrationConfig.findMany({
    where: { isConnected: true },
  });

  if (connectedConfigs.length === 0) {
    return;
  }

  const syncPromises = connectedConfigs.map(async (config) => {
    const platform = config.platform as IntegrationPlatform;
    const adapter = adapters[platform];

    if (!adapter) {
      console.warn(`No adapter registered for platform: ${platform}`);
      return;
    }

    const recordType = (config.defaultRecordType as RecordType) ?? "employee";
    const prefix = platformFieldPrefix[platform];

    try {
      const result = await adapter.syncSubmission(submissionId, recordType);
      const updateData = buildSyncUpdate(prefix, result, recordType);

      await prisma.submission.update({
        where: { id: submissionId },
        data: updateData,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Sync to ${platform} failed for submission ${submissionId}:`, errorMessage);

      const updateData = buildSyncUpdate(prefix, {
        success: false,
        error: errorMessage,
      }, recordType);

      try {
        await prisma.submission.update({
          where: { id: submissionId },
          data: updateData,
        });
      } catch (updateErr) {
        console.error(`Failed to update sync status for ${platform}:`, updateErr);
      }
    }
  });

  await Promise.allSettled(syncPromises);
}
