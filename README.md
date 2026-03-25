# Open I-9

A self-hostable web portal for USCIS Form I-9 (Employment Eligibility Verification). Employers deploy their own instance, employees complete the form remotely, and the system generates the official I-9 PDF with all data filled in. PII is encrypted at rest, uploaded documents are purged after review, and the completed I-9 is ready to file.

Built for small and mid-size businesses that need a simple, compliant way to handle I-9s without paying for enterprise HR software.

## What It Does

**For the employer:**
- Create a one-time invite link and send it to a new hire (via text, email, or onboarding packet)
- Review the employee's submitted information and uploaded documents
- Approve the submission — documents are permanently deleted, and the completed official USCIS I-9 PDF is generated and available for download
- Maintain a roster of employees and contractors with hire dates, termination dates, and renewal tracking

**For the employee:**
- Open the invite link on any device (phone, tablet, computer)
- Complete the I-9 form in 4 guided steps: personal info, citizenship attestation, document upload, and review
- Draw a signature on screen
- Submit — done

**What makes it compliant:**
- Fills in the actual USCIS Form I-9 PDF (Edition 01/20/25), not a custom substitute
- Collects all fields required by Section 1 and Section 2
- SSN collection adapts based on whether you use E-Verify (required) or not (voluntary, per USCIS guidelines)
- Uploaded documents are reviewed by the employer then permanently deleted — you're not required to retain copies, and this avoids liability
- Employee roster tracks I-9 retention periods (3 years from hire or 1 year after termination)
- When USCIS releases a new form version, upload it in the admin panel and remap fields — no code changes needed

## Features

- **Official I-9 PDF generation** — Fills the real USCIS form with employee and employer data
- **Invite-based access** — Single-use, expiring links. No public form exposure.
- **PII encryption at rest** — AES-256-GCM encryption on all sensitive fields before database storage
- **Document upload and purge** — Employees upload identity documents for review. Documents are permanently deleted on approval or rejection.
- **E-Verify awareness** — Toggle in settings. When enabled, SSN is required. When disabled, SSN is voluntary with USCIS-compliant messaging.
- **Employee and contractor support** — Worker type (Employee/Contractor) set per invite. Labels adapt throughout (hire date vs. engagement date, terminate vs. end engagement).
- **Signature pad** — Employees draw their signature on screen (mouse or touch)
- **Employer Section 2 auto-fill** — Configure your employer info once in settings. It fills into every I-9 PDF automatically.
- **I-9 form management** — Upload new USCIS form versions, inspect PDF fields, and remap without code changes
- **Renewal tracking** — Automatic expiration detection with admin alerts and one-click renewal invites
- **Email notifications** — Submission summaries sent to configurable recipients via Resend or SMTP
- **White-label branding** — Custom logo, colors, and messaging
- **Accounting integrations** — Optional sync to QuickBooks, Xero, Zoho Books, or FreshBooks. Credentials configured in the admin UI, not env vars.
- **Admin dashboard** — Review submissions, manage employees, configure settings, export data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Prisma ORM (SQLite for local dev) |
| PDF | pdf-lib (fills official USCIS I-9 form) |
| Email | Resend (primary) or SMTP fallback |
| File Storage | Local disk or S3-compatible bucket |
| Auth | Admin secret + invite tokens |
| Deployment | Docker Compose, Railway, or Vercel |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or use SQLite for local dev, or Docker Compose for both)

### 1. Clone and install

```bash
git clone https://github.com/joshgoble/open-i9.git
cd open-i9
./setup.sh
```

The setup script installs dependencies, creates your `.env` with a generated encryption key, prompts for an admin password, and sets up the SQLite database. Then:

```bash
npm run dev
```

Open `http://localhost:3000/admin`, log in, and the dashboard will walk you through the remaining setup (E-Verify selection and employer info).

> **Manual setup**: If you prefer not to use the setup script, see the [Environment Variables](#environment-variables) section and [.env.example](.env.example).

### Docker Compose (recommended for production)

```bash
cp .env.example .env
# Edit .env with production values (use a real Postgres URL, strong secrets, etc.)
docker compose up -d
docker compose exec app npx prisma migrate deploy
```

## How It Works

### Employee Flow

1. Employer creates an invite link from `/admin/invites` (choose Employee or Contractor)
2. Employee opens the link on their device
3. Employee completes the 4-step form:
   - **Personal info** — Name, address, DOB, SSN (required if E-Verify, voluntary if not), email, phone
   - **Citizenship & signature** — Immigration status attestation, drawn signature, date
   - **Documents** — Select List A or List B+C, enter issuing authority and document number, upload a photo/scan
   - **Review & submit** — Verify everything, submit
4. Submission is encrypted and stored. Notification emails sent to HR.
5. Employee is added to the roster. Invite is marked as used.

### Admin Flow

1. Log in at `/admin`
2. **Submissions** — Review pending submissions. View uploaded documents. Approve (enter hire date, documents are purged, I-9 PDF generated) or reject (documents purged).
3. **Employees** — View roster. Filter by status. Send renewal invites. Terminate with required date.
4. **Invites** — Create invite links (employee or contractor, custom expiry). Copy link to text/email.
5. **Config** — E-Verify setting, employer info, branding, notification emails.
6. **Integrations** — Connect accounting platforms. Setup instructions and credential management built in.
7. **I-9 Form** — Upload new USCIS form versions. Inspect PDF fields. Remap field names.

### I-9 PDF Generation

The system fills in the official USCIS Form I-9 PDF directly:
- **Section 1** (Employee) — All personal info, citizenship status, signature, date
- **Section 2** (Employer) — Document details with issuing authority, employer certification, business info
- The bundled form is Edition 01/20/25 (expires 05/31/2027)
- When a new version is released, upload it at `/admin/i9-form` and remap any changed field names

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (or `file:./dev.db` for SQLite) |
| `ADMIN_SECRET` | Yes | Password for admin dashboard |
| `DATA_ENCRYPTION_KEY` | Yes | 64-char hex string for AES-256 PII encryption |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (e.g., `https://i9.yourcompany.com`) |
| `RESEND_API_KEY` | No | Resend API key for email |
| `EMAIL_FROM` | No | Sender email address |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | No | SMTP fallback if Resend not configured |
| `STORAGE_PROVIDER` | No | `local` (default) or `s3` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | No | S3-compatible storage credentials |

Accounting integration credentials (QuickBooks, Xero, Zoho, FreshBooks) are configured in the admin UI, not environment variables.

## Security

### PII Encryption

All sensitive data is encrypted at the application layer before database storage using AES-256-GCM:

- **Encrypted fields**: Address, city, ZIP, DOB, SSN (full and last-4), email, phone, alien registration number, I-94 number, foreign passport number, employee signature
- **Plain-text exceptions**: First name and last name (needed for admin search)
- **Key**: Single `DATA_ENCRYPTION_KEY` env var. Integration token encryption keys are derived from this automatically.

### Document Handling

- Employees upload photos/scans of identity documents during the form
- Documents are stored temporarily for employer review
- On approval or rejection, **all uploaded documents are permanently deleted** from storage
- The upload privacy notice explains this to employees before they upload

### Access Control

- Employee form: Single-use invite tokens with configurable expiration
- Admin dashboard: `ADMIN_SECRET` via bearer token + session cookie for browser requests
- Invite creation: Blocked until E-Verify and employer info are configured
- All API inputs validated with zod

## Accounting Integrations

Optional sync to accounting platforms after submission approval. Credentials are entered in the admin UI with step-by-step setup instructions for each vendor.

| Platform | Record Types | Setup |
|----------|-------------|-------|
| QuickBooks Online | Employee, Vendor | Admin > Integrations |
| Xero | Employee (Payroll), Contact | Admin > Integrations |
| Zoho Books | Contact | Admin > Integrations |
| FreshBooks | Team Member, Bill Vendor | Admin > Integrations |

Each integration page shows:
- Step-by-step vendor setup instructions
- The exact redirect URI to copy into the vendor's app settings
- Credential input fields (Client ID, Client Secret, environment/region)
- Connect/disconnect controls

## Development

```bash
npm run dev              # Dev server
npm run build            # Production build
npm start                # Production server
npx prisma migrate dev   # Run migrations
npx prisma studio        # Browse database
```

## Deployment

### Docker (recommended)

The `Dockerfile` uses multi-stage builds with Next.js standalone output.

```bash
docker compose up -d
docker compose exec app npx prisma migrate deploy
```

### Railway

1. Connect your repo
2. Add a PostgreSQL plugin
3. Set environment variables
4. Railway auto-detects Next.js

### Vercel

1. Connect your repo
2. Set environment variables (including external Postgres URL)
3. Add `npx prisma generate` to the build command

## License

MIT
