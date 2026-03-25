"use client";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminContext } from "@/contexts/AdminContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";

function AdminNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive =
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? "bg-white/20 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function LoginForm({ onLogin }: { onLogin: (secret: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/submissions", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.status === 401) {
        setError("Invalid admin secret.");
      } else {
        onLogin(password);
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Admin Login
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter the admin secret to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Admin Secret
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="Enter admin secret"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("adminSecret");
    if (stored) {
      setSecret(stored);
    }
    setChecked(true);
  }, []);

  function handleLogin(value: string) {
    sessionStorage.setItem("adminSecret", value);
    // Set cookie so browser-initiated requests (img src, links) can auth
    document.cookie = `admin_secret=${encodeURIComponent(value)}; path=/; SameSite=Strict`;
    setSecret(value);
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!secret) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <AuthenticatedLayout secret={secret}>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({
  secret,
  children,
}: {
  secret: string;
  children: React.ReactNode;
}) {
  const auth = useAdminAuth(secret);

  function handleLogout() {
    sessionStorage.removeItem("adminSecret");
    document.cookie = "admin_secret=; path=/; max-age=0";
    window.location.href = "/admin";
  }

  return (
    <AdminContext.Provider value={auth}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-indigo-700 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-1">
                <Link
                  href="/admin"
                  className="text-white font-bold text-lg mr-6"
                >
                  I-9 Admin
                </Link>
                <nav className="flex items-center gap-1">
                  <AdminNavLink href="/admin" label="Submissions" />
                  <AdminNavLink href="/admin/employees" label="Employees" />
                  <AdminNavLink href="/admin/invites" label="Invites" />
                  <AdminNavLink href="/admin/config" label="Config" />
                  <AdminNavLink
                    href="/admin/integrations"
                    label="Integrations"
                  />
                  <AdminNavLink
                    href="/admin/i9-form"
                    label="I-9 Form"
                  />
                </nav>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  );
}
