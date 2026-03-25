import { NextResponse } from "next/server";
import { handleCallback } from "@/lib/integrations/zoho";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/admin/config?integration_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing required parameter: code" },
      { status: 400 }
    );
  }

  try {
    await handleCallback(code);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/admin/config?integration_connected=zoho`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Zoho OAuth callback error:", message);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/admin/config?integration_error=${encodeURIComponent(message)}`
    );
  }
}
