import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic", // iPhone default photo format
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
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadFile(buffer, file.type);

    return NextResponse.json({ fileKey: result.fileKey, url: result.url });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
