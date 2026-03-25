import { NextResponse } from "next/server";
import { z } from "zod";
import { isSetupComplete, createAdminUser, login, changePassword, isAuthorized } from "@/lib/auth";

const setupSchema = z.object({
  action: z.literal("setup"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  action: z.literal("login"),
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  action: z.literal("change-password"),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const bodySchema = z.discriminatedUnion("action", [
  setupSchema,
  loginSchema,
  changePasswordSchema,
]);

/**
 * GET: Check if setup is complete (public — needed by the login screen).
 */
export async function GET() {
  const setupDone = await isSetupComplete();
  return NextResponse.json({ setupComplete: setupDone });
}

/**
 * POST: Handle setup, login, and change-password actions.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.action === "setup") {
      const setupDone = await isSetupComplete();
      if (setupDone) {
        return NextResponse.json(
          { error: "Admin account already exists" },
          { status: 400 }
        );
      }

      const sessionToken = await createAdminUser(data.email, data.password);
      return NextResponse.json({ sessionToken });
    }

    if (data.action === "login") {
      const sessionToken = await login(data.email, data.password);
      if (!sessionToken) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      return NextResponse.json({ sessionToken });
    }

    if (data.action === "change-password") {
      const authorized = await isAuthorized(request);
      if (!authorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const token = request.headers.get("authorization")?.slice(7) ?? "";
      const success = await changePassword(token, data.currentPassword, data.newPassword);

      if (!success) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: "Password changed. Please log in again." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
