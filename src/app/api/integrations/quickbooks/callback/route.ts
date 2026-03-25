import { NextResponse } from "next/server";
import { handleCallback } from "@/lib/integrations/quickbooks";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const error = url.searchParams.get("error");

  if (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/admin/config?integration_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !realmId) {
    return NextResponse.json(
      { error: "Missing required parameters: code and realmId" },
      { status: 400 }
    );
  }

  try {
    await handleCallback(code, realmId);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/admin/config?integration_connected=quickbooks`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("QuickBooks OAuth callback error:", message);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/admin/config?integration_error=${encodeURIComponent(message)}`
    );
  }
}
