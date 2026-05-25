import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/db";
import { log } from "@/lib/audit";
import { authConfig } from "./auth.config";

const providers: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${
        process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || "common"
      }/v2.0`,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      const existingAdminCount = await prisma.adminUser.count();

      // Bootstrap: if the allowlist is empty, the first OAuth signer becomes
      // the founding admin and can manage further additions from the UI.
      if (existingAdminCount === 0) {
        await prisma.adminUser.create({
          data: {
            email,
            name: profile?.name ?? user.name ?? null,
          },
        });
        log({
          action: "admin.bootstrap",
          detail: `Bootstrap admin created via OAuth: ${email}`,
          meta: { email },
          actor: email,
        });
        return true;
      }

      const allowed = await prisma.adminUser.findUnique({ where: { email } });
      if (!allowed) {
        log({
          action: "admin.login_denied",
          detail: `OAuth sign-in rejected (not on allowlist): ${email}`,
          meta: { email },
          actor: email,
        });
        return false;
      }

      // Backfill name from OAuth profile if missing.
      if (!allowed.name && (profile?.name || user.name)) {
        await prisma.adminUser.update({
          where: { id: allowed.id },
          data: { name: profile?.name ?? user.name ?? null },
        });
      }

      log({
        action: "admin.login",
        detail: `Admin logged in via OAuth: ${email}`,
        meta: { email },
        actor: email,
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email.toLowerCase().trim();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }
      return session;
    },
  },
});
