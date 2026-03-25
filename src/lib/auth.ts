import { prisma } from "./db";
import { hash, compare } from "bcryptjs";
import { randomBytes } from "crypto";

const BCRYPT_ROUNDS = 12;

/**
 * Check if any admin user exists (i.e., has the app been set up yet).
 */
export async function isSetupComplete(): Promise<boolean> {
  const count = await prisma.adminUser.count();
  return count > 0;
}

/**
 * Create the first admin user during initial setup.
 * Throws if an admin already exists.
 */
export async function createAdminUser(email: string, password: string): Promise<string> {
  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    throw new Error("Admin user already exists");
  }

  const hashedPassword = await hash(password, BCRYPT_ROUNDS);
  const sessionToken = randomBytes(32).toString("hex");

  await prisma.adminUser.create({
    data: {
      email,
      hashedPassword,
      sessionToken,
    },
  });

  return sessionToken;
}

/**
 * Verify credentials and return a session token.
 */
export async function login(email: string, password: string): Promise<string | null> {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await compare(password, user.hashedPassword);
  if (!valid) return null;

  // Generate a new session token on each login
  const sessionToken = randomBytes(32).toString("hex");
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { sessionToken },
  });

  return sessionToken;
}

/**
 * Verify a session token. Used by all API routes.
 * Also supports the legacy ADMIN_SECRET env var for backward compatibility.
 */
export async function verifySession(token: string): Promise<boolean> {
  // Legacy: check env var first for backward compat during migration
  const legacySecret = process.env.ADMIN_SECRET;
  if (legacySecret && token === legacySecret) {
    return true;
  }

  const user = await prisma.adminUser.findUnique({
    where: { sessionToken: token },
  });
  return !!user;
}

/**
 * Change the admin password.
 */
export async function changePassword(
  sessionToken: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const user = await prisma.adminUser.findUnique({
    where: { sessionToken },
  });
  if (!user) return false;

  const valid = await compare(currentPassword, user.hashedPassword);
  if (!valid) return false;

  const hashedPassword = await hash(newPassword, BCRYPT_ROUNDS);
  const newSessionToken = randomBytes(32).toString("hex");

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { hashedPassword, sessionToken: newSessionToken },
  });

  return true;
}

/**
 * Extract bearer token from a request's Authorization header or cookie.
 */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  // Cookie fallback for browser requests (img src, links)
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/admin_token=([^;]+)/);
  return match?.[1] ?? null;
}

/**
 * Check if a request is authorized. Drop-in replacement for the old isAuthorized().
 */
export async function isAuthorized(request: Request): Promise<boolean> {
  const token = extractToken(request);
  if (!token) return false;
  return verifySession(token);
}
