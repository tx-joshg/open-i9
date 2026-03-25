import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const employee = await prisma.employee.findUnique({ where: { id } });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const config = await prisma.portalConfig.findFirst({ where: { id: 1 } });
    const expiryDays = config?.inviteLinkExpiryDays ?? 7;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const invite = await prisma.invite.create({
      data: {
        emailHint: employee.email,
        nameHint: `${employee.firstName} ${employee.lastName}`,
        expiresAt,
        isRenewal: true,
        employeeId: employee.id,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/?token=${invite.token}`;

    return NextResponse.json(
      {
        ...invite,
        inviteUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Send renewal error:", err);
    return NextResponse.json(
      { error: "Failed to create renewal invite" },
      { status: 500 }
    );
  }
}
