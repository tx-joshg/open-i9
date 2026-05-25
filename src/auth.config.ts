import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config (no DB / Node-only imports).
 * Shared by both the full auth setup in `src/auth.ts` and the middleware,
 * which runs on the Edge runtime where Prisma isn't available.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: { strategy: "jwt" },
  // Providers are populated in `src/auth.ts` where env vars + DB are available.
  providers: [],
};
