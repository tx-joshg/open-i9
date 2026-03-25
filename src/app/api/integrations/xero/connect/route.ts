import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/integrations/xero";
import { isAuthorized } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authUrl = await getAuthUrl();
    return NextResponse.json({ url: authUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate auth URL";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
