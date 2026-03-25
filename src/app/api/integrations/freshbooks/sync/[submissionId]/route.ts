import { NextResponse } from "next/server";
import { syncSubmission } from "@/lib/integrations/freshbooks";
import { prisma } from "@/lib/db";
import type { RecordType } from "@/lib/integrations/types";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function POST(
  request: Request,
  { params }: { params: { submissionId: string } }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const config = await prisma.integrationConfig.findUnique({
    where: { platform: "freshbooks" },
  });

  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "FreshBooks is not connected" }, { status: 400 });
  }

  const recordType = (config.defaultRecordType as RecordType) ?? "employee";

  try {
    const result = await syncSubmission(submissionId, recordType);

    if (result.success) {
      return NextResponse.json({
        success: true,
        recordId: result.recordId,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 502 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`FreshBooks sync error for submission ${submissionId}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
