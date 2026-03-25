import { NextResponse } from "next/server";
import { getFileBuffer } from "@/lib/storage";
import { isAuthorized } from "@/lib/auth";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

interface RouteContext {
  params: Promise<{ fileKey: string[] }>;
}

/**
 * File serving for uploads.
 * - Images are public (logos, etc.)
 * - PDFs/documents require admin auth (via header or cookie)
 *
 * Handles both URL shapes:
 *   /api/uploads/abc.png         -> segments = ["abc.png"]
 *   /api/uploads/uploads/abc.png -> segments = ["uploads", "abc.png"]
 */
export async function GET(request: Request, context: RouteContext) {
  const { fileKey: segments } = await context.params;
  const joined = segments.join("/");

  // Validate to prevent path traversal
  if (!joined || joined.includes("..")) {
    return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
  }

  // Normalize: the stored key is always "uploads/uuid.ext"
  const storageKey = joined.startsWith("uploads/") ? joined : `uploads/${joined}`;
  const filename = segments[segments.length - 1];

  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const contentType = MIME_TYPES[ext];

  if (!contentType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  // Non-image files (PDFs) require admin auth
  if (!contentType.startsWith("image/") && !(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const buffer = await getFileBuffer(storageKey);

    const cacheControl = contentType.startsWith("image/")
      ? "public, max-age=3600"
      : "private, max-age=3600";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": cacheControl,
      },
    });
  } catch (err) {
    console.error("File serve error:", err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
