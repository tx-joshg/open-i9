import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPortalConfig, invalidateConfigCache } from "@/lib/config";
import { isAuthorized } from "@/lib/auth";
import { log } from "@/lib/audit";

const notificationEmailSchema = z.object({
  email: z.string().email(),
  label: z.string(),
});

const portalConfigUpdateSchema = z.object({
  businessName: z.string().min(1).optional(),
  logoFileKey: z.string().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional(),
  notificationEmails: z.array(notificationEmailSchema).optional(),
  footerText: z.string().optional(),
  welcomeMessage: z.string().optional(),
  sendEmployeeConfirmation: z.boolean().optional(),
  useEVerify: z.boolean().nullable().optional(),
  employerName: z.string().optional(),
  employerTitle: z.string().optional(),
  employerBusinessName: z.string().optional(),
  employerBusinessAddress: z.string().optional(),
});

export async function GET() {
  try {
    const config = await getPortalConfig();
    return NextResponse.json(config);
  } catch (err) {
    console.error("Config fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load portal config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const parsed = portalConfigUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updatePayload: Record<string, unknown> = {};

    if (data.businessName !== undefined) updatePayload.businessName = data.businessName;
    if (data.logoFileKey !== undefined) updatePayload.logoFileKey = data.logoFileKey;
    if (data.primaryColor !== undefined) updatePayload.primaryColor = data.primaryColor;
    if (data.accentColor !== undefined) updatePayload.accentColor = data.accentColor;
    if (data.footerText !== undefined) updatePayload.footerText = data.footerText;
    if (data.welcomeMessage !== undefined) updatePayload.welcomeMessage = data.welcomeMessage;
    if (data.sendEmployeeConfirmation !== undefined) {
      updatePayload.sendEmployeeConfirmation = data.sendEmployeeConfirmation;
    }
    if (data.useEVerify !== undefined) {
      updatePayload.useEVerify = data.useEVerify;
    }
    if (data.notificationEmails !== undefined) {
      updatePayload.notificationEmails = JSON.stringify(data.notificationEmails);
    }
    if (data.employerName !== undefined) updatePayload.employerName = data.employerName;
    if (data.employerTitle !== undefined) updatePayload.employerTitle = data.employerTitle;
    if (data.employerBusinessName !== undefined) updatePayload.employerBusinessName = data.employerBusinessName;
    if (data.employerBusinessAddress !== undefined) updatePayload.employerBusinessAddress = data.employerBusinessAddress;

    await prisma.portalConfig.upsert({
      where: { id: 1 },
      update: updatePayload,
      create: { id: 1, ...updatePayload },
    });

    invalidateConfigCache();

    const updated = await getPortalConfig();

    log({ action: "config.updated", detail: "Portal configuration updated", actor: "admin" });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Config update error:", err);
    return NextResponse.json(
      { error: "Failed to update portal config" },
      { status: 500 }
    );
  }
}
