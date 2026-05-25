import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";

interface SearchParams {
  callbackUrl?: string;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Your account isn't on the admin allowlist. Ask an existing admin to add your email.",
  Configuration:
    "Sign-in is misconfigured. Check OAuth environment variables.",
  OAuthCallbackError:
    "OAuth handshake failed. The redirect URI may be missing from the provider's app.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/admin";

  const session = await auth();
  if (session?.user?.email) {
    const email = session.user.email.toLowerCase().trim();
    const allowed = await prisma.adminUser.findUnique({ where: { email } });
    if (allowed) redirect(callbackUrl);
  }

  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const microsoftConfigured = !!(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
  );

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? null : null;

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }

  async function signInWithMicrosoft() {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: callbackUrl });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Sign In</h1>
            <p className="text-sm text-gray-500 mt-1">
              Sign in with your work account to manage the I-9 portal.
            </p>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md"
            >
              {errorMessage}
            </p>
          )}

          <div className="space-y-3">
            {microsoftConfigured && (
              <form action={signInWithMicrosoft}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-md bg-white text-gray-800 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                  <MicrosoftLogo />
                  Sign in with Microsoft
                </button>
              </form>
            )}

            {googleConfigured && (
              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-md bg-white text-gray-800 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                  <GoogleLogo />
                  Sign in with Google
                </button>
              </form>
            )}

            {!googleConfigured && !microsoftConfigured && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
                No OAuth providers are configured. Set GOOGLE_CLIENT_ID /
                AUTH_MICROSOFT_ENTRA_ID_ID environment variables.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4.5 24 4.5 12.9 4.5 4 13.4 4 24.5s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44.5c5.2 0 9.8-2 13.3-5.3l-6.1-5.2C29.1 35.6 26.7 36.5 24 36.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 40 16.3 44.5 24 44.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2.1 3.9-3.9 5.2l6.1 5.2C40.4 35.6 44 30.5 44 24.5c0-1.3-.1-2.7-.4-4z"
      />
    </svg>
  );
}
