import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";
import { log } from "@/lib/audit";

const employeePatchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "terminated"]).optional(),
  hireDate: z.string().optional().nullable(),
  terminatedAt: z.string().optional(),
  notes: z.string().optional().nullable(),
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
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        submissions: {
          select: {
            id: true,
            createdAt: true,
            status: true,
            isRenewal: true,
            nextRenewalDate: true,
            citizenshipStatus: true,
            docChoice: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (err) {
    console.error("Employee fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
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
    const existing = await prisma.employee.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = employeePatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updatePayload: Record<string, unknown> = {};

    if (data.firstName !== undefined) updatePayload.firstName = data.firstName;
    if (data.lastName !== undefined) updatePayload.lastName = data.lastName;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.hireDate !== undefined) {
      updatePayload.hireDate = data.hireDate ? new Date(data.hireDate) : null;
    }

    if (data.status !== undefined) {
      if (data.status === "terminated") {
        if (!data.terminatedAt) {
          return NextResponse.json(
            { error: "Termination date is required" },
            { status: 400 }
          );
        }
        updatePayload.status = data.status;
        updatePayload.terminatedAt = new Date(data.terminatedAt);
      } else {
        updatePayload.status = data.status;
        if (data.status === "active" && existing.status === "terminated") {
          updatePayload.terminatedAt = null;
        }
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: updatePayload,
    });

    if (data.status === "terminated") {
      log({
        action: "employee.terminated",
        detail: `Terminated ${existing.firstName} ${existing.lastName}`,
        meta: { employeeId: id },
        actor: "admin",
      });
    } else if (data.status === "active" && existing.status === "terminated") {
      log({
        action: "employee.reactivated",
        detail: `Reactivated ${existing.firstName} ${existing.lastName}`,
        meta: { employeeId: id },
        actor: "admin",
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Employee update error:", err);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.employee.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        status: "terminated",
        terminatedAt: existing.terminatedAt ?? new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Employee soft-delete error:", err);
    return NextResponse.json(
      { error: "Failed to terminate employee" },
      { status: 500 }
    );
  }
}
