import { NextResponse } from "next/server";
import { getFileBuffer } from "@/lib/storage";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

interface RouteContext {
  params: Promise<{ fileKey: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileKey } = await context.params;

  // Validate fileKey format (uuid.ext) to prevent path traversal
  if (!fileKey || fileKey.includes("/") || fileKey.includes("..")) {
    return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
  }

  const ext = fileKey.split(".").pop()?.toLowerCase() || "";
  const contentType = MIME_TYPES[ext];

  if (!contentType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const fullKey = fileKey.startsWith("uploads/") ? fileKey : `uploads/${fileKey}`;
    const buffer = await getFileBuffer(fullKey);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileKey}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Document fetch error:", err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
