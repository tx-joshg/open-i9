import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Submission } from "@prisma/client";
import type { PortalConfig } from "@/types/i9";
import { getFileBuffer, getFileUrl } from "./storage";
import { decryptSubmissionPii, type DecryptedSubmissionPii } from "./pii";
import { log } from "@/lib/audit";

interface EmailAttachment {
  filename: string;
  content: Buffer;
}

async function resolveAttachments(submission: Submission): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = [];
  const fileKeys: { key: string | null; label: string }[] = [
    { key: submission.listAFileKey, label: `${submission.lastName}_ListA` },
    { key: submission.listBFileKey, label: `${submission.lastName}_ListB` },
    { key: submission.listCFileKey, label: `${submission.lastName}_ListC` },
  ];

  for (const { key, label } of fileKeys) {
    if (!key) continue;
    try {
      const buffer = await getFileBuffer(key);
      const ext = key.split(".").pop() || "bin";
      attachments.push({ filename: `${label}.${ext}`, content: buffer });
    } catch (err) {
      console.error(`Failed to resolve attachment ${key}:`, err);
    }
  }

  return attachments;
}

function buildHtmlBody(
  submission: Submission,
  pii: DecryptedSubmissionPii,
  config: PortalConfig
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = config.logoFileKey ? getFileUrl(config.logoFileKey) : null;

  const citizenshipLabels: Record<string, string> = {
    usCitizen: "U.S. Citizen",
    usnational: "Noncitizen National",
    lpr: "Lawful Permanent Resident",
    authorized: "Noncitizen Authorized to Work",
  };

  return `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:${config.primaryColor};padding:20px;text-align:center;">
        ${logoUrl ? `<img src="${logoUrl}" alt="${config.businessName}" style="max-height:60px;margin-bottom:10px;" />` : ""}
        <h1 style="color:white;margin:0;font-size:20px;">${config.businessName}</h1>
      </div>
      <div style="padding:20px;border:1px solid #e5e7eb;">
        <h2 style="color:${config.primaryColor};margin-top:0;">New I-9 Submission</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:6px;border-bottom:1px solid #eee;">${submission.firstName} ${submission.lastName}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:6px;border-bottom:1px solid #eee;">${pii.email}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">Phone</td><td style="padding:6px;border-bottom:1px solid #eee;">${pii.phone || "N/A"}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">Address</td><td style="padding:6px;border-bottom:1px solid #eee;">${pii.address}${pii.aptUnit ? `, ${pii.aptUnit}` : ""}, ${pii.city}, ${submission.state} ${pii.zip}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">Date of Birth</td><td style="padding:6px;border-bottom:1px solid #eee;">${new Date(pii.dob).toLocaleDateString()}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">SSN (last 4)</td><td style="padding:6px;border-bottom:1px solid #eee;">${pii.ssnLast4 ? `•••-••-${pii.ssnLast4}` : "Not provided"}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">Citizenship Status</td><td style="padding:6px;border-bottom:1px solid #eee;">${citizenshipLabels[submission.citizenshipStatus] || submission.citizenshipStatus}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">Documents</td><td style="padding:6px;border-bottom:1px solid #eee;">${submission.docChoice === "listA" ? `List A: ${submission.listADoc}` : `List B: ${submission.listBDoc}, List C: ${submission.listCDoc}`}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;border-bottom:1px solid #eee;">Submitted</td><td style="padding:6px;border-bottom:1px solid #eee;">${new Date(submission.createdAt).toLocaleString()}</td></tr>
        </table>
        <p style="margin-top:20px;"><a href="${appUrl}/admin/submissions/${submission.id}" style="color:${config.primaryColor};">View in Admin Portal →</a></p>
        <p style="font-size:12px;color:#6b7280;margin-top:20px;">This form collects information for USCIS Form I-9 purposes only. Employers must complete Section 2 within 3 business days of the employee's first day of work.</p>
      </div>
    </div>
  `;
}

async function sendViaResend(
  to: string[],
  subject: string,
  html: string,
  attachments: EmailAttachment[]
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@example.com",
    to,
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
}

async function sendViaSMTP(
  to: string[],
  subject: string,
  html: string,
  attachments: EmailAttachment[]
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transport.sendMail({
    from: process.env.EMAIL_FROM || "noreply@example.com",
    to: to.join(","),
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
}

export async function sendSubmissionEmail(
  submission: Submission,
  config: PortalConfig
): Promise<void> {
  const recipients = config.notificationEmails.map((e) => e.email);
  if (recipients.length === 0) {
    console.warn("No notification emails configured, skipping email");
    return;
  }

  const pii = decryptSubmissionPii(submission);
  const subject = `New I-9 Submission — ${submission.firstName} ${submission.lastName} (${config.businessName})`;
  const html = buildHtmlBody(submission, pii, config);
  const attachments = await resolveAttachments(submission);

  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend(recipients, subject, html, attachments);
      for (const recipient of recipients) {
        log({ action: "email.sent", detail: `Notification sent to ${recipient}`, actor: "system" });
      }
    } catch (error) {
      for (const recipient of recipients) {
        log({ action: "email.failed", detail: `Failed to send to ${recipient}: ${error}`, actor: "system" });
      }
      throw error;
    }
  } else if (process.env.SMTP_HOST) {
    try {
      await sendViaSMTP(recipients, subject, html, attachments);
      for (const recipient of recipients) {
        log({ action: "email.sent", detail: `Notification sent to ${recipient}`, actor: "system" });
      }
    } catch (error) {
      for (const recipient of recipients) {
        log({ action: "email.failed", detail: `Failed to send to ${recipient}: ${error}`, actor: "system" });
      }
      throw error;
    }
  } else {
    console.warn("No email provider configured (RESEND_API_KEY or SMTP_HOST). Email not sent.");
  }
}

export async function sendEmployeeConfirmationEmail(
  submission: Submission,
  config: PortalConfig
): Promise<void> {
  if (!config.sendEmployeeConfirmation) return;

  const pii = decryptSubmissionPii(submission);
  const subject = `Your I-9 has been received — ${config.businessName}`;
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;padding:20px;">
      <h2 style="color:${config.primaryColor};">Thank you, ${submission.firstName}!</h2>
      <p>Your I-9 Employment Eligibility Verification form has been received by <strong>${config.businessName}</strong>.</p>
      <p>Your employer will complete Section 2 of the I-9 within 3 business days of your first day of work. Please bring your original identification documents.</p>
      <p style="font-size:12px;color:#6b7280;margin-top:30px;">This is an automated confirmation. Please do not reply to this email.</p>
    </div>
  `;

  const to = [pii.email];
  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend(to, subject, html, []);
      log({ action: "email.sent", detail: `Notification sent to ${pii.email}`, actor: "system" });
    } catch (error) {
      log({ action: "email.failed", detail: `Failed to send to ${pii.email}: ${error}`, actor: "system" });
      throw error;
    }
  } else if (process.env.SMTP_HOST) {
    try {
      await sendViaSMTP(to, subject, html, []);
      log({ action: "email.sent", detail: `Notification sent to ${pii.email}`, actor: "system" });
    } catch (error) {
      log({ action: "email.failed", detail: `Failed to send to ${pii.email}: ${error}`, actor: "system" });
      throw error;
    }
  }
}
