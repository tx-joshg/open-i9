import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";

const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  hireDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status && ["active", "inactive", "terminated"].includes(status)) {
      where.status = status;
    }

    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          submissions: {
            select: {
              id: true,
              createdAt: true,
              nextRenewalDate: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    const result = employees.map((emp) => {
      const submissionCount = emp.submissions.length;
      const latestSubmission = emp.submissions[0] ?? null;
      const latestSubmissionDate = latestSubmission?.createdAt ?? null;
      const nextRenewalDate = latestSubmission?.nextRenewalDate ?? null;

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        status: emp.status,
        hireDate: emp.hireDate,
        terminatedAt: emp.terminatedAt,
        notes: emp.notes,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
        submissionCount,
        latestSubmissionDate,
        nextRenewalDate,
      };
    });

    return NextResponse.json({
      employees: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Employees list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const employee = await prisma.employee.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    console.error("Employee creation error:", err);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
