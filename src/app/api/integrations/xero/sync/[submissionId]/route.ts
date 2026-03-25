import { NextResponse } from "next/server";
import { syncSubmission } from "@/lib/integrations/xero";
import { prisma } from "@/lib/db";
import type { RecordType } from "@/lib/integrations/types";
import { isAuthorized } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { submissionId: string } }
) {
  if (!(await isAuthorized(request))) {
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
    where: { platform: "xero" },
  });

  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Xero is not connected" }, { status: 400 });
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
    console.error(`Xero sync error for submission ${submissionId}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
