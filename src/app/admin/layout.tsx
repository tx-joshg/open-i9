import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminProvider } from "@/contexts/AdminContext";
import { ToastProvider } from "@/components/ui/Toast";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The login page lives at /admin/login but must not get the protected chrome
  // (and must not trigger the redirect loop that would result from this layout
  // sending unauthed visitors there). Middleware forwards the request path via
  // an `x-pathname` header so this server component can branch on it.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) redirect("/admin/login");

  const allowed = await prisma.adminUser.findUnique({ where: { email } });
  if (!allowed) redirect("/admin/login?error=AccessDenied");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <ToastProvider>
      <AdminProvider>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-indigo-700 shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-1">
                  <Link
                    href="/admin"
                    className="text-white font-bold text-lg mr-6"
                  >
                    Open I-9
                  </Link>
                  <AdminNav />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white/80 hidden sm:inline">
                    {allowed.name ?? email}
                  </span>
                  <form action={handleSignOut}>
                    <button
                      type="submit"
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </AdminProvider>
    </ToastProvider>
  );
}
