import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { saveCredentials } from "@/lib/integrations/credentials";
import type { IntegrationPlatform } from "@/lib/integrations/types";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

const VALID_PLATFORMS: IntegrationPlatform[] = [
  "quickbooks",
  "xero",
  "zoho",
  "freshbooks",
];

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.integrationConfig.findMany({
      select: {
        platform: true,
        isConnected: true,
        defaultRecordType: true,
        encryptedClientId: true,
        encryptedClientSecret: true,
        environment: true,
        connectedAt: true,
      },
    });

    const integrations = configs.map((config) => ({
      platform: config.platform,
      isConnected: config.isConnected,
      defaultRecordType: config.defaultRecordType,
      hasCredentials: !!(config.encryptedClientId && config.encryptedClientSecret),
      environment: config.environment,
      connectedAt: config.connectedAt,
    }));

    return NextResponse.json({ integrations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching integrations:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const credentialsSchema = z.object({
  platform: z.enum(["quickbooks", "xero", "zoho", "freshbooks"]),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  environment: z.string().optional(),
});

/**
 * POST: Save OAuth credentials for a platform
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const parsed = credentialsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { platform, clientId, clientSecret, environment } = parsed.data;

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform: ${platform}` },
        { status: 400 }
      );
    }

    await saveCredentials(platform, clientId, clientSecret, environment);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error saving credentials:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
