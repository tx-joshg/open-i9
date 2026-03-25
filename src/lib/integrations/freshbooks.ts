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

const OAUTH_AUTHORIZE_URL = "https://auth.freshbooks.com/oauth/authorize";
const OAUTH_TOKEN_URL = "https://api.freshbooks.com/auth/oauth/token";
const API_BASE = "https://api.freshbooks.com";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/integrations/freshbooks/callback`;
}

/**
 * Builds the FreshBooks OAuth 2.0 authorization URL.
 */
export async function getAuthUrl(): Promise<string> {
  const creds = await getCredentials("freshbooks");
  if (!creds) throw new Error("FreshBooks credentials not configured");

  const params = new URLSearchParams({
    client_id: creds.clientId,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    state: "fb_connect",
  });

  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface FreshBooksUserResponse {
  response: {
    id: number;
    memberships: Array<{
      id: number;
      role: string;
      business: {
        id: number;
        account_id: string;
      };
    }>;
  };
}

/**
 * Exchanges an authorization code for OAuth tokens, fetches the accountId
 * from /auth/api/v1/users/me, and stores everything encrypted.
 */
export async function handleCallback(code: string): Promise<void> {
  const creds = await getCredentials("freshbooks");
  if (!creds) throw new Error("FreshBooks credentials not configured");
  const tokenKey = getTokenEncryptionKey("freshbooks");

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FreshBooks token exchange failed: ${response.status} ${errorText}`);
  }

  const tokens: TokenResponse = await response.json();

  // Fetch the accountId from /auth/api/v1/users/me
  const meResponse = await fetch(`${API_BASE}/auth/api/v1/users/me`, {
    headers: {
      "Authorization": `Bearer ${tokens.access_token}`,
      "Accept": "application/json",
    },
  });

  if (!meResponse.ok) {
    const errorText = await meResponse.text();
    throw new Error(`FreshBooks /users/me failed: ${meResponse.status} ${errorText}`);
  }

  const meData: FreshBooksUserResponse = await meResponse.json();
  const accountId = meData.response.memberships?.[0]?.business?.account_id;

  if (!accountId) {
    throw new Error("FreshBooks /users/me response did not contain an accountId");
  }

  const encryptedAccessToken = encrypt(tokens.access_token, tokenKey);
  const encryptedRefreshToken = encrypt(tokens.refresh_token, tokenKey);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.integrationConfig.upsert({
    where: { platform: "freshbooks" },
    create: {
      platform: "freshbooks",
      isConnected: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      accountId,
      connectedAt: new Date(),
    },
    update: {
      isConnected: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      accountId,
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
    throw new Error("FreshBooks config missing token expiry or refresh token");
  }

  const expiresAt = config.tokenExpiresAt.getTime();
  const now = Date.now();

  if (expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return config;
  }

  const creds = await getCredentials("freshbooks");
  if (!creds) throw new Error("FreshBooks credentials not configured");
  const tokenKey = getTokenEncryptionKey("freshbooks");

  const refreshToken = decrypt(config.encryptedRefreshToken, tokenKey);

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FreshBooks token refresh failed: ${response.status} ${errorText}`);
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

interface FBTeamMemberPayload {
  team_member: {
    fname: string;
    lname: string;
    email: string;
  };
}

interface FBBillVendorPayload {
  bill_vendor: {
    vendor_name: string;
    email: string;
    phone?: string;
    street: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
  };
}

/**
 * Syncs a submission to FreshBooks as either a Team Member or Bill Vendor record.
 */
export async function syncSubmission(
  submissionId: string,
  recordType: RecordType
): Promise<SyncResult> {
  const config = await prisma.integrationConfig.findUnique({
    where: { platform: "freshbooks" },
  });

  if (!config || !config.isConnected) {
    return { success: false, error: "FreshBooks is not connected" };
  }

  const refreshedConfig = await refreshTokenIfNeeded(config);

  if (!refreshedConfig.encryptedAccessToken || !refreshedConfig.accountId) {
    return { success: false, error: "FreshBooks config missing access token or accountId" };
  }

  const tokenKey = getTokenEncryptionKey("freshbooks");
  const accessToken = decrypt(refreshedConfig.encryptedAccessToken, tokenKey);

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return { success: false, error: `Submission ${submissionId} not found` };
  }

  const pii = decryptSubmissionPii(submission);

  const accountId = refreshedConfig.accountId;

  let endpoint: string;
  let payload: FBTeamMemberPayload | FBBillVendorPayload;

  if (recordType === "employee") {
    endpoint = `${API_BASE}/accounting/account/${accountId}/team/team_members`;
    payload = {
      team_member: {
        fname: submission.firstName,
        lname: submission.lastName,
        email: pii.email,
      },
    };
  } else {
    endpoint = `${API_BASE}/accounting/account/${accountId}/bill_vendors/bill_vendors`;
    const billVendor: FBBillVendorPayload["bill_vendor"] = {
      vendor_name: `${submission.firstName} ${submission.lastName}`,
      email: pii.email,
      street: pii.address,
      city: pii.city,
      province: submission.state,
      postal_code: pii.zip,
      country: "United States",
    };
    if (pii.phone) {
      billVendor.phone = pii.phone;
    }
    payload = { bill_vendor: billVendor };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (fetchErr) {
    const fetchMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    const error = `FreshBooks API request failed: ${fetchMessage}`;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        fbSyncStatus: "failed",
        fbSyncError: error.slice(0, 500),
        fbRecordType: recordType,
      },
    });

    return { success: false, error };
  }

  if (!response.ok) {
    const errorText = await response.text();
    const error = `FreshBooks API error: ${response.status} ${errorText}`;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        fbSyncStatus: "failed",
        fbSyncError: error.slice(0, 500),
        fbRecordType: recordType,
      },
    });

    return { success: false, error };
  }

  const result = await response.json();

  let recordId: string;
  if (recordType === "employee") {
    recordId = String(result.team_member?.id ?? "");
  } else {
    recordId = String(result.bill_vendor?.id ?? "");
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      fbRecordId: recordId,
      fbRecordType: recordType,
      fbSyncStatus: "synced",
      fbSyncedAt: new Date(),
      fbSyncError: null,
    },
  });

  return { success: true, recordId };
}

/**
 * Disconnects FreshBooks by clearing tokens and marking as disconnected.
 */
export async function disconnect(): Promise<void> {
  await prisma.integrationConfig.updateMany({
    where: { platform: "freshbooks" },
    data: {
      isConnected: false,
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      tokenExpiresAt: null,
      accountId: null,
      connectedAt: null,
    },
  });
}

/**
 * FreshBooks integration adapter conforming to IntegrationAdapter interface.
 */
export const freshbooksAdapter: IntegrationAdapter = {
  syncSubmission,
};
