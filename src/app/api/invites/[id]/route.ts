import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const invite = await prisma.invite.findUnique({ where: { id } });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: "Cannot revoke an invite that has already been used" },
        { status: 400 }
      );
    }

    await prisma.invite.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Invite delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete invite" },
      { status: 500 }
    );
  }
}
