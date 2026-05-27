import { timingSafeEqual } from "node:crypto";

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
 * Service-to-service Bearer auth path.
 *
 * Sister services that can't carry a user session (specifically: the
 * NyTex staff-portal, which mints invites and syncs submissions on a
 * cron) authenticate with `Authorization: Bearer ${SERVICE_TOKEN}`.
 *
 * SERVICE_TOKEN is a long random string stored on this service, mirrored
 * onto the caller via Railway cross-service reference. Compared with a
 * constant-time check so callers can't infer the token from response
 * timing.
 *
 * Returns false when the env var is unset (no service callers configured)
 * or when no Authorization header is present — never bypasses cookie
 * auth, just stacks on top of it.
 */
export function isAuthorizedService(request: Request): boolean {
  const expected = process.env.SERVICE_TOKEN;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const presented = header.slice("Bearer ".length).trim();
  if (!presented) return false;

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Whether the current request is from an allowlisted admin OR an
 * authorized sister service. Either auth path is sufficient.
 *
 * - Cookie/OAuth path: human admin browsing the open-i9 admin UI.
 *   Email must be on the AdminUser allowlist.
 * - Service Bearer path: machine caller (staff-portal). Requires the
 *   SERVICE_TOKEN env var set, and matching Bearer header.
 */
export async function isAuthorized(request: Request): Promise<boolean> {
  if (isAuthorizedService(request)) return true;
  return (await getAdminEmail()) !== null;
}
