import { NextResponse } from "next/server";
import { disconnect } from "@/lib/integrations/zoho";
import { isAuthorized } from "@/lib/auth";

export async function DELETE(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await disconnect();
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Zoho disconnect error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
