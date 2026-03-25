import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: true,
  });
}

interface UploadResult {
  fileKey: string;
  url: string;
}

export async function uploadFile(
  buffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error(`File type ${mimeType} not allowed`);
  }
  if (buffer.length > MAX_SIZE) {
    throw new Error("File exceeds 10MB limit");
  }

  const ext = EXT_MAP[mimeType] || "bin";
  const fileKey = `uploads/${uuidv4()}.${ext}`;

  if (STORAGE_PROVIDER === "s3") {
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || "",
        Key: fileKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    const publicUrl = process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL}/${fileKey}`
      : fileKey;
    return { fileKey, url: publicUrl };
  }

  // Local storage
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(process.cwd(), "public", fileKey);
  await writeFile(filePath, buffer);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return { fileKey, url: `${appUrl}/${fileKey}` };
}

export async function getFileBuffer(fileKey: string): Promise<Buffer> {
  if (STORAGE_PROVIDER === "s3") {
    const s3 = getS3Client();
    const resp = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET || "",
        Key: fileKey,
      })
    );
    const stream = resp.Body;
    if (!stream) throw new Error("Empty S3 response");
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - S3 body is async iterable
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  const filePath = path.join(process.cwd(), "public", fileKey);
  return readFile(filePath);
}

export async function deleteFile(fileKey: string): Promise<void> {
  if (STORAGE_PROVIDER === "s3") {
    const s3 = getS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET || "",
        Key: fileKey,
      })
    );
    return;
  }

  const filePath = path.join(process.cwd(), "public", fileKey);
  await unlink(filePath);
}

export function getFileUrl(fileKey: string): string {
  if (STORAGE_PROVIDER === "s3" && process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL}/${fileKey}`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/${fileKey}`;
}
