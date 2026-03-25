import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.max(1, parseInt(searchParams.get("days") || "90", 10));

    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const submissions = await prisma.submission.findMany({
      where: {
        nextRenewalDate: {
          gte: now,
          lte: cutoff,
        },
      },
      orderBy: { nextRenewalDate: "asc" },
      select: {
        id: true,
        createdAt: true,
        nextRenewalDate: true,
        citizenshipStatus: true,
        docChoice: true,
        listADoc: true,
        listBDoc: true,
        listCDoc: true,
        isRenewal: true,
        status: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
        // Fallback fields if no linked employee
        firstName: true,
        lastName: true,
      },
    });

    const result = submissions.map((sub) => ({
      submissionId: sub.id,
      submissionDate: sub.createdAt,
      nextRenewalDate: sub.nextRenewalDate,
      citizenshipStatus: sub.citizenshipStatus,
      docChoice: sub.docChoice,
      listADoc: sub.listADoc,
      listBDoc: sub.listBDoc,
      listCDoc: sub.listCDoc,
      isRenewal: sub.isRenewal,
      submissionStatus: sub.status,
      employeeId: sub.employee?.id ?? sub.employeeId,
      employeeName: sub.employee
        ? `${sub.employee.firstName} ${sub.employee.lastName}`
        : `${sub.firstName} ${sub.lastName}`,
      employeeEmail: sub.employee?.email ?? null,
      employeeStatus: sub.employee?.status ?? null,
    }));

    return NextResponse.json({ renewals: result, total: result.length });
  } catch (err) {
    console.error("Upcoming renewals error:", err);
    return NextResponse.json(
      { error: "Failed to fetch upcoming renewals" },
      { status: 500 }
    );
  }
}
