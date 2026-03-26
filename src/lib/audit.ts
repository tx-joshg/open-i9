import { prisma } from "@/lib/db";

interface LogEntry {
  action: string;
  detail?: string;
  meta?: Record<string, unknown>;
  actor?: string;
}

export async function log(entry: LogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        detail: entry.detail ?? null,
        meta: entry.meta ? JSON.stringify(entry.meta) : null,
        actor: entry.actor ?? "system",
      },
    });
  } catch {
    // Never let audit logging break the main flow
    console.error("[audit] Failed to write log:", entry.action);
  }
}
