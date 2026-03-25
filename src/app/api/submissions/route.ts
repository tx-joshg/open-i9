import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPortalConfig } from "@/lib/config";
import { sendSubmissionEmail, sendEmployeeConfirmationEmail } from "@/lib/email";
import { encryptPii, encryptPiiOrNull } from "@/lib/pii";
import { isAuthorized } from "@/lib/auth";

const citizenshipStatusSchema = z.enum(["usCitizen", "usnational", "lpr", "authorized"]);
const docChoiceSchema = z.enum(["listA", "listBC"]);

const submissionSchema = z.object({
  // Personal
  lastName: z.string().min(1, "Last name is required"),
  firstName: z.string().min(1, "First name is required"),
  middleInitial: z.string().max(1).optional().default(""),
  otherLastNames: z.string().optional().default(""),
  address: z.string().min(1, "Address is required"),
  aptUnit: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP code is required"),
  dob: z.string().min(1, "Date of birth is required"),
  ssn: z.string().optional().default(""),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().default(""),

  // Eligibility
  citizenshipStatus: citizenshipStatusSchema,
  alienRegNumber: z.string().optional().default(""),
  i94Number: z.string().optional().default(""),
  foreignPassportNumber: z.string().optional().default(""),
  passportCountry: z.string().optional().default(""),
  authExpDate: z.string().optional().default(""),
  attestationChecked: z.literal(true, {
    errorMap: () => ({ message: "You must attest under penalty of perjury" }),
  }),
  signatureDataUrl: z.string().min(1, "Signature is required"),
  signatureDate: z.string().min(1, "Signature date is required"),

  // Documents
  docChoice: docChoiceSchema,
  listADoc: z.string().optional().default(""),
  listADocNumber: z.string().optional().default(""),
  listAExpDate: z.string().optional().default(""),
  listAFileKey: z.string().optional().default(""),
  listAIssuingAuthority: z.string().optional().default(""),
  listBDoc: z.string().optional().default(""),
  listBDocNumber: z.string().optional().default(""),
  listBExpDate: z.string().optional().default(""),
  listBFileKey: z.string().optional().default(""),
  listBIssuingAuthority: z.string().optional().default(""),
  listCDoc: z.string().optional().default(""),
  listCDocNumber: z.string().optional().default(""),
  listCExpDate: z.string().optional().default(""),
  listCFileKey: z.string().optional().default(""),
  listCIssuingAuthority: z.string().optional().default(""),

  // Invite token (optional — used to link submission to employee)
  inviteToken: z.string().optional(),
});

function extractSsnLast4(ssn: string): string | null {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length >= 4) {
    return digits.slice(-4);
  }
  return null;
}

function toDateOrNull(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date;
}

function calculateNextRenewalDate(dates: {
  authExpDate: string;
  listAExpDate: string;
  listBExpDate: string;
  listCExpDate: string;
}): Date | null {
  const candidates: Date[] = [];

  for (const value of Object.values(dates)) {
    const date = toDateOrNull(value);
    if (date) candidates.push(date);
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((earliest, d) => (d < earliest ? d : earliest));
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = submissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const ssnLast4 = extractSsnLast4(data.ssn);
    const ssnDigits = data.ssn.replace(/\D/g, "");
    const fullSsn = ssnDigits.length === 9 ? ssnDigits : null;

    const dob = new Date(data.dob);
    const signatureDate = new Date(data.signatureDate);

    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth" },
        { status: 400 }
      );
    }
    if (isNaN(signatureDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid signature date" },
        { status: 400 }
      );
    }

    const nextRenewalDate = calculateNextRenewalDate({
      authExpDate: data.authExpDate,
      listAExpDate: data.listAExpDate,
      listBExpDate: data.listBExpDate,
      listCExpDate: data.listCExpDate,
    });

    // Resolve invite token if provided
    let employeeId: string | null = null;
    let isRenewal = false;

    if (data.inviteToken) {
      const invite = await prisma.invite.findUnique({
        where: { token: data.inviteToken },
      });

      if (invite && !invite.usedAt && invite.expiresAt > new Date()) {
        // Mark invite as used
        await prisma.invite.update({
          where: { id: invite.id },
          data: { usedAt: new Date() },
        });

        isRenewal = invite.isRenewal;

        if (invite.employeeId) {
          employeeId = invite.employeeId;
        } else {
          // Create a new employee from submission data
          const employee = await prisma.employee.create({
            data: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone || null,
              workerType: invite.workerType ?? "employee",
            },
          });
          employeeId = employee.id;

          // Link invite to new employee
          await prisma.invite.update({
            where: { id: invite.id },
            data: { employeeId: employee.id },
          });
        }
      }
    }

    const submission = await prisma.submission.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleInitial: data.middleInitial || null,
        otherLastNames: data.otherLastNames || null,

        // Encrypted PII fields
        encryptedAddress: encryptPii(data.address),
        encryptedAptUnit: encryptPiiOrNull(data.aptUnit || null),
        encryptedCity: encryptPii(data.city),
        state: data.state,
        encryptedZip: encryptPii(data.zip),
        encryptedDob: encryptPii(data.dob),
        encryptedSsn: encryptPiiOrNull(fullSsn),
        encryptedSsnLast4: encryptPiiOrNull(ssnLast4),
        encryptedEmail: encryptPii(data.email),
        encryptedPhone: encryptPiiOrNull(data.phone || null),

        citizenshipStatus: data.citizenshipStatus,
        encryptedAlienRegNumber: encryptPiiOrNull(data.alienRegNumber || null),
        encryptedI94Number: encryptPiiOrNull(data.i94Number || null),
        encryptedForeignPassport: encryptPiiOrNull(data.foreignPassportNumber || null),
        passportCountry: data.passportCountry || null,
        authExpDate: toDateOrNull(data.authExpDate),
        encryptedSignatureDataUrl: encryptPii(data.signatureDataUrl),
        signatureDate,

        docChoice: data.docChoice,
        listADoc: data.listADoc || null,
        listADocNumber: data.listADocNumber || null,
        listAExpDate: toDateOrNull(data.listAExpDate),
        listAFileKey: data.listAFileKey || null,
        listAIssuingAuthority: data.listAIssuingAuthority || null,
        listBDoc: data.listBDoc || null,
        listBDocNumber: data.listBDocNumber || null,
        listBExpDate: toDateOrNull(data.listBExpDate),
        listBFileKey: data.listBFileKey || null,
        listBIssuingAuthority: data.listBIssuingAuthority || null,
        listCDoc: data.listCDoc || null,
        listCDocNumber: data.listCDocNumber || null,
        listCExpDate: toDateOrNull(data.listCExpDate),
        listCFileKey: data.listCFileKey || null,
        listCIssuingAuthority: data.listCIssuingAuthority || null,

        status: "pending_review",
        nextRenewalDate,
        employeeId,
        isRenewal,
      },
    });

    // Send emails non-blocking
    const config = await getPortalConfig();
    sendSubmissionEmail(submission, config).catch((err) =>
      console.error("Failed to send submission email:", err)
    );
    sendEmployeeConfirmationEmail(submission, config).catch((err) =>
      console.error("Failed to send employee confirmation email:", err)
    );

    return NextResponse.json({ id: submission.id, success: true }, { status: 201 });
  } catch (err) {
    console.error("Submission creation error:", err);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}

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

    if (status && ["pending_review", "approved", "rejected"].includes(status)) {
      where.status = status;
    }

    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
      ];
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          citizenshipStatus: true,
          docChoice: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          isRenewal: true,
          employeeId: true,
          nextRenewalDate: true,
        },
      }),
      prisma.submission.count({ where }),
    ]);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Submissions list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
