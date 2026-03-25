import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSubmissionPii } from "@/lib/pii";
import { getPortalConfig } from "@/lib/config";
import { generateI9Pdf, buildI9PdfData } from "@/lib/i9pdf";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET}`) return true;
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/admin_secret=([^;]+)/);
  return match?.[1] === process.env.ADMIN_SECRET;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const submission = await prisma.submission.findUnique({ where: { id } });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const pii = decryptSubmissionPii(submission);
    const config = await getPortalConfig();
    const pdfData = buildI9PdfData(submission, pii, config);
    const pdfBytes = await generateI9Pdf(pdfData);

    const filename = `I-9_${submission.lastName}_${submission.firstName}_${submission.createdAt.toISOString().split("T")[0]}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("I-9 PDF generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate I-9 PDF" },
      { status: 500 }
    );
  }
}
