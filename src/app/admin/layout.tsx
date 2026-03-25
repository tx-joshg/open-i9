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

function SetupForm({ onSetup }: { onSetup: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Setup failed.");
        return;
      }

      onSetup(data.sessionToken);
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Welcome to Open I-9
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Create your admin account to get started.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="setup-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="setup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="admin@yourcompany.com"
              />
            </div>

            <div>
              <label htmlFor="setup-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="setup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label htmlFor="setup-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="setup-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="Confirm your password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password || !confirmPassword}
              className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating Account..." : "Create Admin Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      onLogin(data.sessionToken);
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
            Sign in to manage your I-9 portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="admin@yourcompany.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
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
  const [token, setToken] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function init() {
      // Check if setup is complete
      try {
        const res = await fetch("/api/auth");
        const data = await res.json();
        setSetupComplete(data.setupComplete);
      } catch {
        setSetupComplete(false);
      }

      // Check for stored session
      const stored = sessionStorage.getItem("adminToken");
      if (stored) {
        setToken(stored);
      }
      setChecked(true);
    }
    init();
  }, []);

  function handleAuth(sessionToken: string) {
    sessionStorage.setItem("adminToken", sessionToken);
    document.cookie = `admin_token=${encodeURIComponent(sessionToken)}; path=/; SameSite=Strict`;
    setToken(sessionToken);
    setSetupComplete(true);
  }

  if (!checked || setupComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!setupComplete) {
    return <SetupForm onSetup={handleAuth} />;
  }

  if (!token) {
    return <LoginForm onLogin={handleAuth} />;
  }

  return <AuthenticatedLayout token={token}>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const auth = useAdminAuth(token);

  function handleLogout() {
    sessionStorage.removeItem("adminToken");
    document.cookie = "admin_token=; path=/; max-age=0";
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
                  Open I-9
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
