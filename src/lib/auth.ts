import { auth } from "@/auth";
import { prisma } from "./db";

/**
 * Returns the admin email on the current request if (a) a valid NextAuth
 * session exists and (b) that email is on the AdminUser allowlist.
 *
 * Returns null when unauthenticated or not allowlisted.
 */
export async function getAdminEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return null;

  const allowed = await prisma.adminUser.findUnique({ where: { email } });
  return allowed ? email : null;
}

/**
 * Whether the current request is from an allowlisted admin.
 * Drop-in replacement for the previous token-based isAuthorized().
 *
 * NextAuth reads its session from cookies on the incoming request via
 * the Next.js headers/cookies API, so the `request` argument is unused
 * but kept for compatibility with existing call sites.
 */
export async function isAuthorized(_request: Request): Promise<boolean> {
  return (await getAdminEmail()) !== null;
}
