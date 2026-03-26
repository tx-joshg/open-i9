import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPortalConfig } from "@/lib/config";
import { isAuthorized } from "@/lib/auth";
import { log } from "@/lib/audit";

const createInviteSchema = z.object({
  emailHint: z.string().optional(),
  nameHint: z.string().optional(),
  expiryDays: z.number().int().positive().optional(),
  isRenewal: z.boolean().optional(),
  employeeId: z.string().optional(),
  workerType: z.enum(["employee", "contractor"]).optional().default("employee"),
});

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const [invites, total] = await Promise.all([
      prisma.invite.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          token: true,
          emailHint: true,
          nameHint: true,
          expiresAt: true,
          usedAt: true,
          isRenewal: true,
          createdAt: true,
          employeeId: true,
          workerType: true,
        },
      }),
      prisma.invite.count(),
    ]);

    return NextResponse.json({
      invites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Invites list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
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
    const parsed = createInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check that required compliance config is complete
    const config = await getPortalConfig();
    if (config.useEVerify === null) {
      return NextResponse.json(
        { error: "You must configure E-Verify status in Settings before creating invites." },
        { status: 400 }
      );
    }
    if (!config.employerName || !config.employerTitle || !config.employerBusinessName || !config.employerBusinessAddress) {
      return NextResponse.json(
        { error: "You must complete Employer Information in Settings before creating invites." },
        { status: 400 }
      );
    }

    let expiryDays = data.expiryDays;
    if (!expiryDays) {
      const dbConfig = await prisma.portalConfig.findFirst({ where: { id: 1 } });
      expiryDays = dbConfig?.inviteLinkExpiryDays ?? 7;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const invite = await prisma.invite.create({
      data: {
        emailHint: data.emailHint || null,
        nameHint: data.nameHint || null,
        expiresAt,
        isRenewal: data.isRenewal ?? false,
        employeeId: data.employeeId || null,
        workerType: data.workerType ?? "employee",
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/?token=${invite.token}`;

    log({
      action: "invite.created",
      detail: `Invite created for ${data.emailHint || "anonymous"}`,
      meta: { inviteId: invite.id, emailHint: data.emailHint, workerType: data.workerType },
      actor: "admin",
    });

    return NextResponse.json(
      {
        ...invite,
        inviteUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Invite creation error:", err);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
