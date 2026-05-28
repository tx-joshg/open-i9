import { NextResponse } from "next/server";
import heicConvert from "heic-convert";
import { uploadFile } from "@/lib/storage";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic", // iPhone default photo format — converted to JPEG before storage
  "image/heif",
  "application/pdf",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Duck-typed FormData file. We don't `instanceof File` because the
// `File` global isn't reliably present in all Node runtimes (Node 18
// lacks it entirely; Node 20 only exposes it via `node:buffer`). The
// Web File interface always exposes `name`, `type`, `size`, and
// `arrayBuffer()` — that's all the upload route actually needs.
type UploadedFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function isUploadedFile(x: unknown): x is UploadedFile {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
    typeof (x as { size?: unknown }).size === "number" &&
    typeof (x as { type?: unknown }).type === "string"
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!isUploadedFile(file)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10MB size limit" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    let mimeType = file.type;

    // Convert HEIC/HEIF → JPEG so browsers (esp Chrome) can render previews
    // in the admin console. Storage layer also rejects HEIC, so this has to
    // happen before uploadFile().
    if (mimeType === "image/heic" || mimeType === "image/heif") {
      const jpegArrayBuffer = await heicConvert({
        buffer: arrayBuffer,
        format: "JPEG",
        quality: 0.92,
      });
      buffer = Buffer.from(jpegArrayBuffer);
      mimeType = "image/jpeg";
    }

    const result = await uploadFile(buffer, mimeType);

    return NextResponse.json({ fileKey: result.fileKey, url: result.url });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
