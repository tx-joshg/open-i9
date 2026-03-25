import { prisma } from "./db";
import type { PortalConfig, NotificationEmail } from "@/types/i9";

let cachedConfig: PortalConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function getPortalConfig(): Promise<PortalConfig> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  let row = await prisma.portalConfig.findFirst({ where: { id: 1 } });

  if (!row) {
    row = await prisma.portalConfig.create({ data: { id: 1 } });
  }

  const config: PortalConfig = {
    id: row.id,
    businessName: row.businessName,
    logoFileKey: row.logoFileKey,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    notificationEmails: JSON.parse(row.notificationEmails) as NotificationEmail[],
    footerText: row.footerText,
    welcomeMessage: row.welcomeMessage,
    sendEmployeeConfirmation: row.sendEmployeeConfirmation,
    useEVerify: row.useEVerify,
    employerName: row.employerName,
    employerTitle: row.employerTitle,
    employerBusinessName: row.employerBusinessName,
    employerBusinessAddress: row.employerBusinessAddress,
  };

  cachedConfig = config;
  cacheTime = Date.now();
  return config;
}

export function invalidateConfigCache(): void {
  cachedConfig = null;
  cacheTime = 0;
}
