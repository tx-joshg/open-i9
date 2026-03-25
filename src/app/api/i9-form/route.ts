import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getFileBuffer } from "@/lib/storage";
import { invalidateConfigCache } from "@/lib/config";
import { DEFAULT_FIELD_MAPPING } from "@/lib/i9-field-mapping";
import { isAuthorized } from "@/lib/auth";

interface PdfFieldInfo {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "other";
  value: string;
}

async function loadPdfBytes(fileKey: string | null): Promise<Buffer> {
  if (fileKey) {
    try {
      return await getFileBuffer(fileKey);
    } catch { /* fall through */ }
  }
  return readFile(path.join(process.cwd(), "src", "lib", "i9-form.pdf"));
}

/**
 * GET: Returns current I-9 form info — PDF field names, current mapping, and form status.
 */
export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await prisma.portalConfig.findFirst({
      where: { id: 1 },
      select: { i9FormFileKey: true, i9FieldMapping: true },
    });

    const fileKey = config?.i9FormFileKey ?? null;
    const pdfBytes = await loadPdfBytes(fileKey);

    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = doc.getForm();
    const fields = form.getFields();

    const pdfFields: PdfFieldInfo[] = fields.map((f) => {
      const typeName = f.constructor.name;
      let type: PdfFieldInfo["type"] = "other";
      let value = "";

      if (typeName === "PDFTextField") {
        type = "text";
        try { value = f.getName(); } catch { /* */ }
      } else if (typeName === "PDFCheckBox") {
        type = "checkbox";
      } else if (typeName === "PDFDropdown") {
        type = "dropdown";
      }

      return { name: f.getName(), type, value };
    });

    let storedMapping: Record<string, string> = {};
    if (config?.i9FieldMapping) {
      try {
        storedMapping = JSON.parse(config.i9FieldMapping) as Record<string, string>;
      } catch { /* */ }
    }

    return NextResponse.json({
      hasCustomForm: !!fileKey,
      fileKey,
      pdfFields,
      defaultMapping: DEFAULT_FIELD_MAPPING,
      storedMapping,
      totalFields: pdfFields.length,
    });
  } catch (err) {
    console.error("I-9 form inspect error:", err);
    return NextResponse.json(
      { error: "Failed to inspect I-9 form" },
      { status: 500 }
    );
  }
}

/**
 * PUT: Save the field mapping and/or upload a new I-9 form PDF.
 * Body: { fileKey?: string, mapping?: Record<string, string> }
 */
export async function PUT(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      fileKey?: string | null;
      mapping?: Record<string, string>;
    };

    const updatePayload: Record<string, unknown> = {};

    if (body.fileKey !== undefined) {
      updatePayload.i9FormFileKey = body.fileKey;
    }

    if (body.mapping !== undefined) {
      updatePayload.i9FieldMapping = JSON.stringify(body.mapping);
    }

    await prisma.portalConfig.upsert({
      where: { id: 1 },
      update: updatePayload,
      create: { id: 1, ...updatePayload },
    });

    invalidateConfigCache();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("I-9 form update error:", err);
    return NextResponse.json(
      { error: "Failed to update I-9 form configuration" },
      { status: 500 }
    );
  }
}
