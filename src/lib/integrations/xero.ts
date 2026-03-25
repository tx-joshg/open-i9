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

const OAUTH_AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const OAUTH_TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const PAYROLL_API_BASE = "https://api.xero.com/payroll/2.0";
const CONTACTS_API_BASE = "https://api.xero.com/api.xro/2.0";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/integrations/xero/callback`;
}

/**
 * Builds the Xero OAuth 2.0 authorization URL.
 */
export async function getAuthUrl(): Promise<string> {
  const creds = await getCredentials("xero");
  if (!creds) throw new Error("Xero credentials not configured");

  const params = new URLSearchParams({
    client_id: creds.clientId,
    response_type: "code",
    scope: "openid profile email accounting.contacts payroll.employees",
    redirect_uri: getRedirectUri(),
    state: "xero_connect",
  });

  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface XeroConnection {
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

/**
 * Exchanges an authorization code for OAuth tokens, retrieves the tenantId
 * from the Xero connections endpoint, and stores everything encrypted.
 */
export async function handleCallback(code: string): Promise<void> {
  const creds = await getCredentials("xero");
  if (!creds) throw new Error("Xero credentials not configured");
  const tokenKey = getTokenEncryptionKey("xero");

  const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");

  const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
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

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Xero token exchange failed: ${tokenResponse.status} ${errorText}`);
  }

  const tokens: TokenResponse = await tokenResponse.json();

  // Retrieve tenantId from Xero connections endpoint
  const connectionsResponse = await fetch(CONNECTIONS_URL, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!connectionsResponse.ok) {
    const errorText = await connectionsResponse.text();
    throw new Error(`Xero connections fetch failed: ${connectionsResponse.status} ${errorText}`);
  }

  const connections: XeroConnection[] = await connectionsResponse.json();

  if (connections.length === 0) {
    throw new Error("No Xero organizations found for this account");
  }

  const tenantId = connections[0].tenantId;

  const encryptedAccessToken = encrypt(tokens.access_token, tokenKey);
  const encryptedRefreshToken = encrypt(tokens.refresh_token, tokenKey);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.integrationConfig.upsert({
    where: { platform: "xero" },
    create: {
      platform: "xero",
      isConnected: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      realmId: tenantId,
      connectedAt: new Date(),
    },
    update: {
      isConnected: true,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      realmId: tenantId,
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
    throw new Error("Xero config missing token expiry or refresh token");
  }

  const expiresAt = config.tokenExpiresAt.getTime();
  const now = Date.now();

  if (expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return config;
  }

  const creds = await getCredentials("xero");
  if (!creds) throw new Error("Xero credentials not configured");
  const tokenKey = getTokenEncryptionKey("xero");

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
    throw new Error(`Xero token refresh failed: ${response.status} ${errorText}`);
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

interface XeroEmployeePayload {
  FirstName: string;
  LastName: string;
  Email: string;
  DateOfBirth: string;
  StartDate: string;
  HomeAddress: {
    AddressLine1: string;
    City: string;
    Region: string;
    PostalCode: string;
    CountryCode: string;
  };
}

interface XeroContactPayload {
  Name: string;
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  Phones: Array<{ PhoneType: string; PhoneNumber: string }>;
  Addresses: Array<{
    AddressType: string;
    AddressLine1: string;
    City: string;
    Region: string;
    PostalCode: string;
    Country: string;
  }>;
  IsSupplier: boolean;
  IsCustomer?: boolean;
}

/**
 * Creates a Contact in the Xero Contacts API (used for vendors/contractors
 * or as a fallback when payroll is unavailable).
 */
async function createXeroContact(
  accessToken: string,
  tenantId: string,
  contactData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    address: string;
    city: string;
    state: string;
    zip: string;
  },
  isSupplier: boolean
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const contactPayload: XeroContactPayload = {
    Name: `${contactData.firstName} ${contactData.lastName}`,
    FirstName: contactData.firstName,
    LastName: contactData.lastName,
    EmailAddress: contactData.email,
    Phones: contactData.phone
      ? [{ PhoneType: "DEFAULT", PhoneNumber: contactData.phone }]
      : [],
    Addresses: [
      {
        AddressType: "STREET",
        AddressLine1: contactData.address,
        City: contactData.city,
        Region: contactData.state,
        PostalCode: contactData.zip,
        Country: "US",
      },
    ],
    IsSupplier: isSupplier,
  };

  if (!isSupplier) {
    contactPayload.IsCustomer = false;
  }

  const response = await fetch(`${CONTACTS_API_BASE}/Contacts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Xero-Tenant-Id": tenantId,
    },
    body: JSON.stringify(contactPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `Xero Contacts API error: ${response.status} ${errorText}` };
  }

  const result = await response.json();
  const contactId: string = result.Contacts?.[0]?.ContactID ?? "";
  return { success: true, recordId: contactId };
}

/**
 * Syncs a submission to Xero as either an Employee (via Payroll API) or
 * Contact (via Contacts API). If the employee sync fails with 403/404
 * (payroll subscription required), it falls back to creating a Contact.
 */
export async function syncSubmission(
  submissionId: string,
  recordType: RecordType
): Promise<SyncResult> {
  const config = await prisma.integrationConfig.findUnique({
    where: { platform: "xero" },
  });

  if (!config || !config.isConnected) {
    return { success: false, error: "Xero is not connected" };
  }

  const refreshedConfig = await refreshTokenIfNeeded(config);

  if (!refreshedConfig.encryptedAccessToken || !refreshedConfig.realmId) {
    return { success: false, error: "Xero config missing access token or tenantId" };
  }

  const tokenKey = getTokenEncryptionKey("xero");
  const accessToken = decrypt(refreshedConfig.encryptedAccessToken, tokenKey);
  const tenantId = refreshedConfig.realmId;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return { success: false, error: `Submission ${submissionId} not found` };
  }

  const pii = decryptSubmissionPii(submission);

  const contactData = {
    firstName: submission.firstName,
    lastName: submission.lastName,
    email: pii.email,
    phone: pii.phone,
    address: pii.address,
    city: pii.city,
    state: submission.state,
    zip: pii.zip,
  };

  if (recordType === "vendor") {
    // Vendor/contractor: create as a supplier Contact
    const contactResult = await createXeroContact(accessToken, tenantId, contactData, true);

    if (!contactResult.success) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          xeroSyncStatus: "failed",
          xeroSyncError: (contactResult.error ?? "Unknown error").slice(0, 500),
          xeroRecordType: "contact",
        },
      });

      return { success: false, error: contactResult.error };
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        xeroRecordId: contactResult.recordId ?? "",
        xeroRecordType: "contact",
        xeroSyncStatus: "synced",
        xeroSyncedAt: new Date(),
        xeroSyncError: null,
      },
    });

    return { success: true, recordId: contactResult.recordId };
  }

  // Employee: attempt Payroll API first
  const employeePayload: XeroEmployeePayload = {
    FirstName: submission.firstName,
    LastName: submission.lastName,
    Email: pii.email,
    DateOfBirth: pii.dob ? pii.dob.split("T")[0] : "",
    StartDate: submission.signatureDate
      ? submission.signatureDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    HomeAddress: {
      AddressLine1: pii.address,
      City: pii.city,
      Region: submission.state,
      PostalCode: pii.zip,
      CountryCode: "US",
    },
  };

  const employeeResponse = await fetch(`${PAYROLL_API_BASE}/employees`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Xero-Tenant-Id": tenantId,
    },
    body: JSON.stringify(employeePayload),
  });

  // If payroll fails with 403 or 404, fall back to Contact
  if (employeeResponse.status === 403 || employeeResponse.status === 404) {
    console.warn(
      `Xero Payroll API returned ${employeeResponse.status} — falling back to Contact creation`
    );

    const contactResult = await createXeroContact(accessToken, tenantId, contactData, false);

    if (!contactResult.success) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          xeroSyncStatus: "failed",
          xeroSyncError: (contactResult.error ?? "Unknown error").slice(0, 500),
          xeroRecordType: "contact",
        },
      });

      return { success: false, error: contactResult.error };
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        xeroRecordId: contactResult.recordId ?? "",
        xeroRecordType: "contact",
        xeroSyncStatus: "synced",
        xeroSyncedAt: new Date(),
        xeroSyncError: null,
      },
    });

    return { success: true, recordId: contactResult.recordId };
  }

  if (!employeeResponse.ok) {
    const errorText = await employeeResponse.text();
    const error = `Xero Payroll API error: ${employeeResponse.status} ${errorText}`;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        xeroSyncStatus: "failed",
        xeroSyncError: error.slice(0, 500),
        xeroRecordType: "employee",
      },
    });

    return { success: false, error };
  }

  const result = await employeeResponse.json();
  const recordId: string = result.Employees?.[0]?.EmployeeID ?? "";

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      xeroRecordId: recordId,
      xeroRecordType: "employee",
      xeroSyncStatus: "synced",
      xeroSyncedAt: new Date(),
      xeroSyncError: null,
    },
  });

  return { success: true, recordId };
}

/**
 * Disconnects Xero by clearing tokens and marking as disconnected.
 */
export async function disconnect(): Promise<void> {
  await prisma.integrationConfig.updateMany({
    where: { platform: "xero" },
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
 * Xero integration adapter conforming to IntegrationAdapter interface.
 */
export const xeroAdapter: IntegrationAdapter = {
  syncSubmission,
};
