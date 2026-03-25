import { prisma } from "@/lib/db";
import { decryptSubmissionPii } from "@/lib/pii";
import { encrypt, decrypt } from "@/lib/integrations/encryption";
import { getCredentials, getTokenEncryptionKey } from "@/lib/integrations/credentials";
import type {
  IntegrationAdapter,
  RecordType,
  SyncResult,
} from "@/lib/integrations/types";
import type { IntegrationConfig } from "@prisma/client";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

type ZohoRegion = "US" | "EU" | "IN" | "AU" | "JP";

const REGION_DOMAINS: Record<ZohoRegion, string> = {
  US: "zoho.com",
  EU: "zoho.eu",
  IN: "zoho.in",
  AU: "zoho.com.au",
  JP: "zoho.jp",
};

const REGION_API_DOMAINS: Record<ZohoRegion, string> = {
  US: "zohoapis.com",
  EU: "zohoapis.eu",
  IN: "zohoapis.in",
  AU: "zohoapis.com.au",
  JP: "zohoapis.jp",
};

function getRegion(region: string): ZohoRegion {
  const normalized = region.toUpperCase() as ZohoRegion;
  if (!(normalized in REGION_DOMAINS)) {
    return "US";
  }
  return normalized;
}

function getAccountsBaseUrl(region: ZohoRegion): string {
  const domain = REGION_DOMAINS[region];
  return `https://accounts.${domain}`;
}

function getApiBaseUrl(region: ZohoRegion): string {
  const domain = REGION_API_DOMAINS[region];
  return `https://www.${domain}/books/v3`;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/integrations/zoho/callback`;
}

/**
 * Builds the Zoho OAuth 2.0 authorization URL with region support.
 */
export async function getAuthUrl(): Promise<string> {
  const creds = await getCredentials("zoho");
  if (!creds) throw new Error("Zoho credentials not configured");
  const region = getRegion(creds.environment ?? "US");

  const params = new URLSearchParams({
    client_id: creds.clientId,
    response_type: "code",
    scope: "ZohoBooks.contacts.CREATE,ZohoBooks.settings.READ",
    redirect_uri: getRedirectUri(),
    access_type: "offline",
    prompt: "consent",
    state: "zoho_connect",
  });

  return `${getAccountsBaseUrl(region)}/oauth/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface ZohoOrganization {
  organization_id: string;
  name: string;
}

interface ZohoOrganizationsResponse {
  organizations: ZohoOrganization[];
}

/**
 * Exchanges an authorization code for OAuth tokens, fetches the organization ID,
 * and stores everything encrypted in the database.
 */
export async function handleCallback(code: string): Promise<void> {
  const creds = await getCredentials("zoho");
  if (!creds) throw new Error("Zoho credentials not configured");
  const tokenKey = getTokenEncryptionKey("zoho");
  const region = getRegion(creds.environment ?? "US");

  const tokenUrl = `${getAccountsBaseUrl(region)}/oauth/v2/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zoho token exchange failed: ${response.status} ${errorText}`);
  }

  const tokens: TokenResponse = await response.json();

  // Fetch the organization ID using the new access token
  const orgsResponse = await fetch(`${getApiBaseUrl(region)}/organizations`, {
    headers: {
      "Authorization": `Zoho-oauthtoken ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!orgsResponse.ok) {
    const errorText = await orgsResponse.text();
    throw new Error(`Zoho organizations fetch failed: ${orgsResponse.status} ${errorText}`);
  }

  const orgsData: ZohoOrganizationsResponse = await orgsResponse.json();

  if (!orgsData.organizations || orgsData.organizations.length === 0) {
    throw new Error("No Zoho Books organizations found for this account");
  }

  const organizationId = orgsData.organizations[0].organization_id;

  const encryptedAccessToken = encrypt(tokens.access_token, tokenKey);
  const encryptedRefreshToken = encrypt(tokens.refresh_token, tokenKey);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.integrationConfig.upsert({
    where: { platform: "zoho" },
    create: {
      platform: "zoho",
      isConnected: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      realmId: organizationId,
      connectedAt: new Date(),
    },
    update: {
      isConnected: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      realmId: organizationId,
      connectedAt: new Date(),
    },
  });
}

/**
 * Refreshes the access token if it expires within the next 5 minutes.
 * Zoho refresh tokens are single-use — each refresh returns a new refresh
 * token that must be stored immediately.
 */
export async function refreshTokenIfNeeded(config: IntegrationConfig): Promise<IntegrationConfig> {
  if (!config.tokenExpiresAt || !config.encryptedRefreshToken) {
    throw new Error("Zoho config missing token expiry or refresh token");
  }

  const expiresAt = config.tokenExpiresAt.getTime();
  const now = Date.now();

  if (expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return config;
  }

  const creds = await getCredentials("zoho");
  if (!creds) throw new Error("Zoho credentials not configured");
  const tokenKey = getTokenEncryptionKey("zoho");
  const region = getRegion(creds.environment ?? "US");

  const refreshToken = decrypt(config.encryptedRefreshToken, tokenKey);
  const tokenUrl = `${getAccountsBaseUrl(region)}/oauth/v2/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zoho token refresh failed: ${response.status} ${errorText}`);
  }

  const tokens: TokenResponse = await response.json();

  const encryptedAccessToken = encrypt(tokens.access_token, tokenKey);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Zoho refresh tokens are single-use: a new refresh token is returned
  // on each refresh and must be stored immediately.
  const encryptedRefreshToken = tokens.refresh_token
    ? encrypt(tokens.refresh_token, tokenKey)
    : config.encryptedRefreshToken;

  return prisma.integrationConfig.update({
    where: { id: config.id },
    data: {
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
    },
  });
}

interface ZohoContactPayload {
  contact_name: string;
  contact_type: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  billing_address: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  notes: string;
}

/**
 * Syncs a submission to Zoho Books as a Contact record.
 * Zoho Books does not have a separate Employee entity — both employees
 * and vendors are created as Contacts with the intended type noted.
 */
export async function syncSubmission(
  submissionId: string,
  recordType: RecordType
): Promise<SyncResult> {
  const config = await prisma.integrationConfig.findUnique({
    where: { platform: "zoho" },
  });

  if (!config || !config.isConnected) {
    return { success: false, error: "Zoho Books is not connected" };
  }

  const refreshedConfig = await refreshTokenIfNeeded(config);

  if (!refreshedConfig.encryptedAccessToken || !refreshedConfig.realmId) {
    return { success: false, error: "Zoho config missing access token or organization ID" };
  }

  const creds = await getCredentials("zoho");
  if (!creds) throw new Error("Zoho credentials not configured");
  const tokenKey = getTokenEncryptionKey("zoho");
  const region = getRegion(creds.environment ?? "US");

  const accessToken = decrypt(refreshedConfig.encryptedAccessToken, tokenKey);
  const organizationId = refreshedConfig.realmId;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return { success: false, error: `Submission ${submissionId} not found` };
  }

  const pii = decryptSubmissionPii(submission);

  const submittedDate = submission.createdAt.toISOString().split("T")[0];

  const payload: ZohoContactPayload = {
    contact_name: `${submission.firstName} ${submission.lastName}`,
    contact_type: "vendor",
    first_name: submission.firstName,
    last_name: submission.lastName,
    email: pii.email,
    billing_address: {
      address: pii.address,
      city: pii.city,
      state: submission.state,
      zip: pii.zip,
      country: "USA",
    },
    notes: `I-9 submitted ${submittedDate}. Intended type: ${recordType}.`,
  };

  if (pii.phone) {
    payload.phone = pii.phone;
  }

  const endpoint = `${getApiBaseUrl(region)}/contacts?organization_id=${organizationId}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = `Zoho Books API error: ${response.status} ${errorText}`;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        zohoSyncStatus: "failed",
        zohoSyncError: error.slice(0, 500),
        zohoRecordType: recordType,
      },
    });

    return { success: false, error };
  }

  const result = await response.json();
  const recordId: string = result.contact?.contact_id ?? "";

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      zohoRecordId: recordId,
      zohoRecordType: recordType,
      zohoSyncStatus: "synced",
      zohoSyncedAt: new Date(),
      zohoSyncError: null,
    },
  });

  return { success: true, recordId };
}

/**
 * Disconnects Zoho Books by clearing tokens and marking as disconnected.
 */
export async function disconnect(): Promise<void> {
  await prisma.integrationConfig.updateMany({
    where: { platform: "zoho" },
    data: {
      isConnected: false,
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      tokenExpiresAt: null,
      realmId: null,
      connectedAt: null,
    },
  });
}

/**
 * Zoho Books integration adapter conforming to IntegrationAdapter interface.
 */
export const zohoAdapter: IntegrationAdapter = {
  syncSubmission,
};
