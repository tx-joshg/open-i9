-- Replace bcrypt-based AdminUser with an OAuth email allowlist.
-- Authentication moves to NextAuth (Google + Microsoft Entra ID); this table
-- now stores the set of email addresses permitted to sign in as admin.

-- Drop password / session columns (uniqueness on sessionToken too).
DROP INDEX IF EXISTS "AdminUser_sessionToken_key";
ALTER TABLE "AdminUser" DROP COLUMN IF EXISTS "hashedPassword";
ALTER TABLE "AdminUser" DROP COLUMN IF EXISTS "sessionToken";

-- Add optional display name (populated from OAuth profile on first sign-in).
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- Pre-seed the bootstrap admin. Skipped if any admin already exists, so this
-- is safe to re-run and a no-op once the allowlist has been populated.
INSERT INTO "AdminUser" ("id", "email", "createdAt", "updatedAt")
SELECT 'seed_bootstrap_oauth_admin', 'josh@nytexfireworks.com', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "AdminUser");
