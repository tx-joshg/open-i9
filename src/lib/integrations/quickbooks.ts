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

const SANDBOX_API_BASE = "https://sandbox-quickbooks.api.intuit.com";
const PRODUCTION_API_BASE = "https://quickbooks.api.intuit.com";

const OAUTH_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const OAUTH_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

function getApiBaseUrl(environment: string | null): string {
  return environment === "production" ? PRODUCTION_API_BASE : SANDBOX_API_BASE;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/integrations/quickbooks/callback`;
}

/**
 * Builds the QuickBooks OAuth 2.0 authorization URL.
 */
export async function getAuthUrl(): Promise<string> {
  const creds = await getCredentials("quickbooks");
  if (!creds) throw new Error("QuickBooks credentials not configured");

  const params = new URLSearchParams({
    client_id: creds.clientId,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: getRedirectUri(),
    state: "qb_connect",
  });

  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchanges an authorization code for OAuth tokens and stores them encrypted.
 */
export async function handleCallback(code: string, realmId: string): Promise<void> {
  const creds = await getCredentials("quickbooks");
  if (!creds) throw new Error("QuickBooks credentials not configured");
  const tokenKey = getTokenEncryptionKey("quickbooks");

  const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks token exchange failed: ${response.status} ${errorText}`);
  }

  const tokens: TokenResponse = await response.json();

  const encryptedAccessToken = encrypt(tokens.access_token, tokenKey);
  const encryptedRefreshToken = encrypt(tokens.refresh_token, tokenKey);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.integrationConfig.upsert({
    where: { platform: "quickbooks" },
    create: {
      platform: "quickbooks",
      isConnected: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      realmId,
      connectedAt: new Date(),
    },
    update: {
      isConnected: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      realmId,
      connectedAt: new Date(),
    },
  });
}

/**
 * Refreshes the access token if it expires within the next 5 minutes.
 * Returns the (possibly refreshed) config.
 */
export async function refreshTokenIfNeeded(config: IntegrationConfig): Promise<IntegrationConfig> {
  if (!config.tokenExpiresAt || !config.encryptedRefreshToken) {
    throw new Error("QuickBooks config missing token expiry or refresh token");
  }

  const expiresAt = config.tokenExpiresAt.getTime();
  const now = Date.now();

  if (expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return config;
  }

  const creds = await getCredentials("quickbooks");
  if (!creds) throw new Error("QuickBooks credentials not configured");
  const tokenKey = getTokenEncryptionKey("quickbooks");

  const refreshToken = decrypt(config.encryptedRefreshToken, tokenKey);
  const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuickBooks token refresh failed: ${response.status} ${errorText}`);
  }

  const tokens: TokenResponse = await response.json();

  const encryptedAccessToken = encrypt(tokens.access_token, tokenKey);
  const encryptedRefreshToken = encrypt(tokens.refresh_token, tokenKey);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  return prisma.integrationConfig.update({
    where: { id: config.id },
    data: {
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
    },
  });
}

interface QBEmployeePayload {
  GivenName: string;
  FamilyName: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  PrimaryAddr?: {
    Line1: string;
    City: string;
    CountrySubDivisionCode: string;
    PostalCode: string;
  };
  SSN?: string;
}

interface QBVendorPayload {
  GivenName: string;
  FamilyName: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1: string;
    City: string;
    CountrySubDivisionCode: string;
    PostalCode: string;
  };
}

/**
 * Syncs a submission to QuickBooks as either an Employee or Vendor record.
 */
export async function syncSubmission(
  submissionId: string,
  recordType: RecordType
): Promise<SyncResult> {
  const config = await prisma.integrationConfig.findUnique({
    where: { platform: "quickbooks" },
  });

  if (!config || !config.isConnected) {
    return { success: false, error: "QuickBooks is not connected" };
  }

  const refreshedConfig = await refreshTokenIfNeeded(config);

  if (!refreshedConfig.encryptedAccessToken || !refreshedConfig.realmId) {
    return { success: false, error: "QuickBooks config missing access token or realmId" };
  }

  const creds = await getCredentials("quickbooks");
  if (!creds) throw new Error("QuickBooks credentials not configured");
  const tokenKey = getTokenEncryptionKey("quickbooks");

  const accessToken = decrypt(refreshedConfig.encryptedAccessToken, tokenKey);

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return { success: false, error: `Submission ${submissionId} not found` };
  }

  const pii = decryptSubmissionPii(submission);

  const baseUrl = getApiBaseUrl(creds.environment);
  const realmId = refreshedConfig.realmId;

  let endpoint: string;
  let payload: QBEmployeePayload | QBVendorPayload;

  const displayName = `${submission.firstName} ${submission.lastName}`;

  if (recordType === "employee") {
    endpoint = `${baseUrl}/v3/company/${realmId}/employee`;
    const employeePayload: QBEmployeePayload = {
      GivenName: submission.firstName,
      FamilyName: submission.lastName,
      DisplayName: displayName,
      PrimaryEmailAddr: { Address: pii.email },
      PrimaryAddr: {
        Line1: pii.address,
        City: pii.city,
        CountrySubDivisionCode: submission.state,
        PostalCode: pii.zip,
      },
    };
    if (pii.phone) {
      employeePayload.PrimaryPhone = { FreeFormNumber: pii.phone };
    }
    payload = employeePayload;
  } else {
    endpoint = `${baseUrl}/v3/company/${realmId}/vendor`;
    const vendorPayload: QBVendorPayload = {
      GivenName: submission.firstName,
      FamilyName: submission.lastName,
      DisplayName: displayName,
      PrimaryEmailAddr: { Address: pii.email },
      BillAddr: {
        Line1: pii.address,
        City: pii.city,
        CountrySubDivisionCode: submission.state,
        PostalCode: pii.zip,
      },
    };
    if (pii.phone) {
      vendorPayload.PrimaryPhone = { FreeFormNumber: pii.phone };
    }
    payload = vendorPayload;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = `QuickBooks API error: ${response.status} ${errorText}`;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        qbSyncStatus: "failed",
        qbSyncError: error.slice(0, 500),
        qbRecordType: recordType,
      },
    });

    return { success: false, error };
  }

  const result = await response.json();
  const entityKey = recordType === "employee" ? "Employee" : "Vendor";
  const recordId: string = result[entityKey]?.Id ?? "";

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      qbRecordId: recordId,
      qbRecordType: recordType,
      qbSyncStatus: "synced",
      qbSyncedAt: new Date(),
      qbSyncError: null,
    },
  });

  return { success: true, recordId };
}

/**
 * Disconnects QuickBooks by clearing tokens and marking as disconnected.
 */
export async function disconnect(): Promise<void> {
  await prisma.integrationConfig.updateMany({
    where: { platform: "quickbooks" },
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
 * QuickBooks integration adapter conforming to IntegrationAdapter interface.
 */
export const quickbooksAdapter: IntegrationAdapter = {
  syncSubmission,
};
