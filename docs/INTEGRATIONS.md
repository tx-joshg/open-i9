# Accounting Integrations

All accounting integrations are **optional**. The I-9 portal works without them — submissions are always saved and emailed regardless of sync status.

When connected, each integration creates a contact/identity record in your accounting platform after a submission is approved. This does **not** set up payroll, W-4, or payment terms — those must be completed in the accounting platform.

## Setup

All integration setup is done through the admin UI at **Admin > Integrations**. No environment variables are needed for integrations — credentials are stored encrypted in the database.

Each integration card shows:
1. Step-by-step instructions for creating an app on the vendor's developer portal
2. The exact **Redirect URI** to copy into the vendor's settings
3. Input fields for **Client ID**, **Client Secret**, and environment/region
4. A **Connect** button that initiates the OAuth flow once credentials are saved

## Vendor-Side Setup

Below is what you need to do on each vendor's platform before entering credentials in the admin UI.

### QuickBooks Online

1. Go to [developer.intuit.com](https://developer.intuit.com) and sign in
2. Click "Create an app" and select "QuickBooks Online and Payments"
3. Under "Keys & OAuth", copy the **Client ID** and **Client Secret**
4. Add the Redirect URI shown in the admin UI to your app's OAuth settings
5. Choose **Sandbox** for testing or **Production** for live data

**Record types**: Employee or Vendor (configurable per integration)

### Xero

1. Go to [developer.xero.com/app/manage](https://developer.xero.com/app/manage) and sign in
2. Click "New app" and choose "Web app"
3. Copy the **Client ID** and generate a **Client Secret**
4. Add the Redirect URI shown in the admin UI to your app's OAuth 2.0 settings

**Record types**: Employee (via Payroll API, falls back to Contact if no payroll subscription) or Contact (for vendors)

### Zoho Books

1. Go to [api-console.zoho.com](https://api-console.zoho.com) and sign in
2. Click "Add Client" and select "Server-based Applications"
3. Copy the **Client ID** and **Client Secret**
4. Add the Redirect URI to the Authorized Redirect URIs
5. Select your **region** (US, EU, IN, AU, or JP) — must match your Zoho account

**Record types**: Contact (Zoho Books uses contacts for both employees and vendors, with a type note)

**Note**: Zoho uses single-use refresh tokens. Each token refresh returns a new refresh token that is stored automatically.

### FreshBooks

1. Go to [my.freshbooks.com](https://my.freshbooks.com), sign in, then go to Settings > Developer Portal
2. Click "Create New App"
3. Copy the **Client ID** and **Client Secret**
4. Add the Redirect URI to the app's redirect URIs

**Record types**: Team Member (limited to name and email) or Bill Vendor (full address and contact info)

## How Sync Works

1. Admin approves a submission
2. If an integration is connected, the system creates a record in the accounting platform
3. Sync status is tracked per submission per platform (synced, failed, or pending)
4. Sync failures do not block the submission — they are logged and can be retried
5. The default record type (Employee or Vendor) is configurable per integration

## Token Security

- OAuth tokens are encrypted at rest using AES-256-GCM
- Encryption keys are derived automatically from `DATA_ENCRYPTION_KEY` — no per-integration keys needed
- Tokens are refreshed automatically when they expire
- Disconnecting an integration clears all stored tokens
