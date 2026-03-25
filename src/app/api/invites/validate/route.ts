import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const validateSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

interface ValidResponse {
  valid: true;
  emailHint: string | null;
  nameHint: string | null;
  isRenewal: boolean;
}

interface InvalidResponse {
  valid: false;
  reason: "expired" | "used" | "not_found";
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = validateSchema.safeParse(body);

    if (!parsed.success) {
      const response: InvalidResponse = { valid: false, reason: "not_found" };
      return NextResponse.json(response);
    }

    const { token } = parsed.data;

    const invite = await prisma.invite.findUnique({ where: { token } });

    if (!invite) {
      const response: InvalidResponse = { valid: false, reason: "not_found" };
      return NextResponse.json(response);
    }

    if (invite.usedAt) {
      const response: InvalidResponse = { valid: false, reason: "used" };
      return NextResponse.json(response);
    }

    if (new Date() > invite.expiresAt) {
      const response: InvalidResponse = { valid: false, reason: "expired" };
      return NextResponse.json(response);
    }

    const response: ValidResponse = {
      valid: true,
      emailHint: invite.emailHint,
      nameHint: invite.nameHint,
      isRenewal: invite.isRenewal,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Invite validation error:", err);
    return NextResponse.json(
      { valid: false, reason: "not_found" } satisfies InvalidResponse
    );
  }
}
