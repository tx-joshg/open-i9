import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { decryptSubmissionPii } from "@/lib/pii";
import { deleteFile } from "@/lib/storage";
import { isAuthorized } from "@/lib/auth";
import { log } from "@/lib/audit";

const submissionPatchSchema = z.object({
  status: z.enum(["pending_review", "approved", "rejected"]).optional(),
  adminNotes: z.string().optional(),
  purgeDocuments: z.boolean().optional(),
  qbRecordType: z.enum(["employee", "vendor"]).optional(),
  xeroRecordType: z.enum(["employee", "vendor"]).optional(),
  zohoRecordType: z.enum(["employee", "vendor"]).optional(),
  fbRecordType: z.enum(["employee", "vendor"]).optional(),
  hireDate: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Decrypt PII fields for the admin UI
    const decryptedPii = decryptSubmissionPii(submission);

    return NextResponse.json({
      ...submission,
      ...decryptedPii,
    });
  } catch (err) {
    console.error("Submission fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.submission.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = submissionPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updatePayload: Record<string, unknown> = {};

    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.adminNotes !== undefined) updatePayload.adminNotes = data.adminNotes;
    if (data.qbRecordType !== undefined) updatePayload.qbRecordType = data.qbRecordType;
    if (data.xeroRecordType !== undefined) updatePayload.xeroRecordType = data.xeroRecordType;
    if (data.zohoRecordType !== undefined) updatePayload.zohoRecordType = data.zohoRecordType;
    if (data.fbRecordType !== undefined) updatePayload.fbRecordType = data.fbRecordType;

    const updated = await prisma.submission.update({
      where: { id },
      data: updatePayload,
    });

    if (data.status === "approved") {
      log({
        action: "submission.approved",
        detail: `Submission approved for ${existing.firstName} ${existing.lastName}`,
        meta: { submissionId: id },
        actor: "admin",
      });
    } else if (data.status === "rejected") {
      log({
        action: "submission.rejected",
        detail: `Submission rejected for ${existing.firstName} ${existing.lastName}`,
        meta: { submissionId: id },
        actor: "admin",
      });
    }

    // Purge documents when approved or rejected
    const shouldPurge = data.purgeDocuments && (data.status === "approved" || data.status === "rejected");
    if (shouldPurge) {
      const fileKeys = [
        existing.listAFileKey,
        existing.listBFileKey,
        existing.listCFileKey,
      ].filter((k): k is string => !!k);

      // Delete files from storage
      for (const fileKey of fileKeys) {
        try {
          await deleteFile(fileKey);
        } catch (err) {
          console.error(`Failed to delete file ${fileKey}:`, err);
        }
      }

      // Clear file key references in the database
      await prisma.submission.update({
        where: { id },
        data: {
          listAFileKey: null,
          listBFileKey: null,
          listCFileKey: null,
        },
      });
    }

    // Set hire date on employee when approved
    if (data.status === "approved" && data.hireDate && existing.employeeId) {
      const hireDateParsed = new Date(data.hireDate);
      if (!isNaN(hireDateParsed.getTime())) {
        await prisma.employee.update({
          where: { id: existing.employeeId },
          data: { hireDate: hireDateParsed },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Submission update error:", err);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}
