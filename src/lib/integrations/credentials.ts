import { prisma } from "@/lib/db";
import { encryptPii, decryptPii } from "@/lib/pii";
import { createHmac } from "crypto";
import type { IntegrationPlatform } from "./types";

export interface IntegrationCredentials {
  clientId: string;
  clientSecret: string;
  environment: string | null;
}

/**
 * Loads and decrypts OAuth credentials for a given integration platform.
 * Returns null if credentials are not configured.
 */
export async function getCredentials(
  platform: IntegrationPlatform
): Promise<IntegrationCredentials | null> {
  const config = await prisma.integrationConfig.findUnique({
    where: { platform },
    select: {
      encryptedClientId: true,
      encryptedClientSecret: true,
      environment: true,
    },
  });

  if (!config?.encryptedClientId || !config?.encryptedClientSecret) {
    return null;
  }

  return {
    clientId: decryptPii(config.encryptedClientId),
    clientSecret: decryptPii(config.encryptedClientSecret),
    environment: config.environment,
  };
}

/**
 * Saves OAuth credentials for a given integration platform (encrypted at rest).
 */
export async function saveCredentials(
  platform: IntegrationPlatform,
  clientId: string,
  clientSecret: string,
  environment?: string
): Promise<void> {
  const encryptedClientId = encryptPii(clientId);
  const encryptedClientSecret = encryptPii(clientSecret);

  await prisma.integrationConfig.upsert({
    where: { platform },
    create: {
      platform,
      encryptedClientId,
      encryptedClientSecret,
      environment: environment ?? null,
    },
    update: {
      encryptedClientId,
      encryptedClientSecret,
      environment: environment ?? undefined,
    },
  });
}

/**
 * Checks if credentials are configured for a given platform.
 */
export async function hasCredentials(
  platform: IntegrationPlatform
): Promise<boolean> {
  const config = await prisma.integrationConfig.findUnique({
    where: { platform },
    select: { encryptedClientId: true, encryptedClientSecret: true },
  });

  return !!(config?.encryptedClientId && config?.encryptedClientSecret);
}

/**
 * Derives a per-integration token encryption key from the DATA_ENCRYPTION_KEY.
 * This avoids needing separate env vars per integration.
 */
export function getTokenEncryptionKey(platform: IntegrationPlatform): string {
  const masterKey = process.env.DATA_ENCRYPTION_KEY ?? "";
  if (!masterKey) {
    throw new Error("DATA_ENCRYPTION_KEY is not set");
  }
  // HMAC-SHA256 to derive a 32-byte key per platform
  return createHmac("sha256", Buffer.from(masterKey, "hex"))
    .update(`token-encryption:${platform}`)
    .digest("hex");
}
