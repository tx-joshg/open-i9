"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/admin", label: "Submissions" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/config", label: "Config" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/i9-form", label: "I-9 Form" },
  { href: "/admin/logs", label: "Activity Log" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const isActive =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
