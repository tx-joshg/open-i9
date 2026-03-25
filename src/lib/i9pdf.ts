import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getFileBuffer } from "@/lib/storage";
import type { DecryptedSubmissionPii } from "@/lib/pii";
import type { PortalConfig } from "@/types/i9";
import { resolveFieldMapping, DEFAULT_FIELD_MAPPING } from "@/lib/i9-field-mapping";
import type { I9FieldMapping } from "@/lib/i9-field-mapping";

export interface I9PdfData {
  // Personal
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  otherLastNames: string | null;
  address: string;
  aptUnit: string | null;
  city: string;
  state: string;
  zip: string;
  dob: string;
  ssn: string | null;
  email: string;
  phone: string | null;

  // Eligibility
  citizenshipStatus: string;
  alienRegNumber: string | null;
  i94Number: string | null;
  foreignPassport: string | null;
  passportCountry: string | null;
  authExpDate: string | null;
  signatureDate: string;

  // Documents
  docChoice: string;
  listADoc: string | null;
  listADocNumber: string | null;
  listAExpDate: string | null;
  listAIssuingAuthority: string | null;
  listBDoc: string | null;
  listBDocNumber: string | null;
  listBExpDate: string | null;
  listBIssuingAuthority: string | null;
  listCDoc: string | null;
  listCDocNumber: string | null;
  listCExpDate: string | null;
  listCIssuingAuthority: string | null;

  // Employer (Section 2 bottom)
  employerName: string;
  employerTitle: string;
  employerBusinessName: string;
  employerBusinessAddress: string;
  firstDayEmployed: string | null;
}

function formatSsn(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return ssn;
}

function formatDateMMDDYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  const yyyy = d.getUTCFullYear().toString();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Loads the I-9 form PDF bytes.
 * If an admin-uploaded form exists in the DB, use that.
 * Otherwise fall back to the bundled default.
 */
async function loadFormPdf(): Promise<Buffer> {
  const config = await prisma.portalConfig.findFirst({
    where: { id: 1 },
    select: { i9FormFileKey: true },
  });

  if (config?.i9FormFileKey) {
    try {
      return await getFileBuffer(config.i9FormFileKey);
    } catch (err) {
      console.warn("Failed to load uploaded I-9 form, falling back to default:", err);
    }
  }

  // Fall back to bundled form
  const formPath = path.join(process.cwd(), "src", "lib", "i9-form.pdf");
  return readFile(formPath);
}

/**
 * Loads the field mapping from the DB, merged with defaults.
 */
async function loadFieldMapping(): Promise<I9FieldMapping> {
  const config = await prisma.portalConfig.findFirst({
    where: { id: 1 },
    select: { i9FieldMapping: true },
  });

  if (config?.i9FieldMapping) {
    try {
      const stored = JSON.parse(config.i9FieldMapping) as Record<string, string>;
      return resolveFieldMapping(stored);
    } catch {
      // Invalid JSON, use defaults
    }
  }

  return DEFAULT_FIELD_MAPPING;
}

/**
 * Fills in the I-9 PDF with submission data using the configured field mapping.
 */
export async function generateI9Pdf(data: I9PdfData): Promise<Uint8Array> {
  const [formBytes, m] = await Promise.all([loadFormPdf(), loadFieldMapping()]);

  const doc = await PDFDocument.load(formBytes, { ignoreEncryption: true });
  const form = doc.getForm();

  function setText(fieldName: string, value: string | null | undefined) {
    if (!value || !fieldName) return;
    try {
      const field = form.getTextField(fieldName);
      field.setText(value);
    } catch {
      console.warn(`I-9 PDF field not found: ${fieldName}`);
    }
  }

  function setCheck(fieldName: string, checked: boolean) {
    if (!checked || !fieldName) return;
    try {
      const field = form.getCheckBox(fieldName);
      field.check();
    } catch {
      console.warn(`I-9 PDF checkbox not found: ${fieldName}`);
    }
  }

  function setDropdown(fieldName: string, value: string | null | undefined) {
    if (!value || !fieldName) return;
    try {
      const field = form.getDropdown(fieldName);
      field.select(value);
    } catch {
      console.warn(`I-9 PDF dropdown not found: ${fieldName}`);
    }
  }

  // --- Section 1: Employee Information ---
  setText(m.lastName, data.lastName);
  setText(m.firstName, data.firstName);
  setText(m.middleInitial, data.middleInitial);
  setText(m.otherLastNames, data.otherLastNames);
  setText(m.address, data.address);
  setText(m.aptUnit, data.aptUnit);
  setText(m.city, data.city);
  setDropdown(m.state, data.state);
  setText(m.zip, data.zip);
  setText(m.dob, formatDateMMDDYYYY(data.dob));
  setText(m.ssn, data.ssn ?? "");
  setText(m.email, data.email);
  setText(m.phone, data.phone);

  // Citizenship status checkboxes
  switch (data.citizenshipStatus) {
    case "usCitizen":
      setCheck(m.cbCitizen, true);
      break;
    case "usnational":
      setCheck(m.cbNational, true);
      break;
    case "lpr":
      setCheck(m.cbLpr, true);
      setText(m.uscisNumber, data.alienRegNumber);
      break;
    case "authorized":
      setCheck(m.cbAuthorized, true);
      setText(m.authExpDate, formatDateMMDDYYYY(data.authExpDate));
      setText(m.uscisNumber, data.alienRegNumber);
      setText(m.i94Number, data.i94Number);
      if (data.foreignPassport) {
        const passportField = data.passportCountry
          ? `${data.foreignPassport} (${data.passportCountry})`
          : data.foreignPassport;
        setText(m.foreignPassport, passportField);
      }
      break;
  }

  // Employee signature
  setText(m.employeeSignature, "(electronically signed)");
  setText(m.employeeSignatureDate, formatDateMMDDYYYY(data.signatureDate));

  // --- Section 2: Documents ---
  if (data.docChoice === "listA") {
    setText(m.listADocTitle, data.listADoc);
    setText(m.listAIssuingAuthority, data.listAIssuingAuthority);
    setText(m.listADocNumber, data.listADocNumber);
    setText(m.listAExpDate, formatDateMMDDYYYY(data.listAExpDate));
  } else {
    setText(m.listBDocTitle, data.listBDoc);
    setText(m.listBIssuingAuthority, data.listBIssuingAuthority);
    setText(m.listBDocNumber, data.listBDocNumber);
    setText(m.listBExpDate, formatDateMMDDYYYY(data.listBExpDate));

    setText(m.listCDocTitle, data.listCDoc);
    setText(m.listCIssuingAuthority, data.listCIssuingAuthority);
    setText(m.listCDocNumber, data.listCDocNumber);
    setText(m.listCExpDate, formatDateMMDDYYYY(data.listCExpDate));
  }

  // --- Section 2: Employer ---
  const today = formatDateMMDDYYYY(new Date().toISOString());
  setText(m.firstDayEmployed, data.firstDayEmployed ? formatDateMMDDYYYY(data.firstDayEmployed) : today);
  setText(m.employerNameAndTitle,
    data.employerName && data.employerTitle
      ? `${data.employerName}, ${data.employerTitle}`
      : data.employerName || ""
  );
  setText(m.employerSignature, data.employerName || "(pending)");
  setText(m.employerSignatureDate, today);
  setText(m.employerBusinessName, data.employerBusinessName);
  setText(m.employerBusinessAddress, data.employerBusinessAddress);

  // Section 2 employee name repeat
  setText(m.section2LastName, data.lastName);
  setText(m.section2FirstName, data.firstName);
  setText(m.section2MiddleInitial, data.middleInitial);

  // Mark all fields read-only
  for (const field of form.getFields()) {
    field.enableReadOnly();
  }

  return doc.save();
}

/**
 * Build I9PdfData from a submission record + decrypted PII + portal config.
 */
export function buildI9PdfData(
  submission: {
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    otherLastNames: string | null;
    state: string;
    citizenshipStatus: string;
    passportCountry: string | null;
    authExpDate: Date | null;
    encryptedSignatureDataUrl: string | null;
    signatureDate: Date;
    createdAt: Date;
    docChoice: string;
    listADoc: string | null;
    listADocNumber: string | null;
    listAExpDate: Date | null;
    listAIssuingAuthority: string | null;
    listBDoc: string | null;
    listBDocNumber: string | null;
    listBExpDate: Date | null;
    listBIssuingAuthority: string | null;
    listCDoc: string | null;
    listCDocNumber: string | null;
    listCExpDate: Date | null;
    listCIssuingAuthority: string | null;
  },
  pii: DecryptedSubmissionPii,
  config: PortalConfig
): I9PdfData {
  return {
    lastName: submission.lastName,
    firstName: submission.firstName,
    middleInitial: submission.middleInitial,
    otherLastNames: submission.otherLastNames,
    address: pii.address,
    aptUnit: pii.aptUnit,
    city: pii.city,
    state: submission.state,
    zip: pii.zip,
    dob: pii.dob,
    ssn: pii.ssn ? formatSsn(pii.ssn) : (pii.ssnLast4 ? `***-**-${pii.ssnLast4}` : null),
    email: pii.email,
    phone: pii.phone,
    citizenshipStatus: submission.citizenshipStatus,
    alienRegNumber: pii.alienRegNumber,
    i94Number: pii.i94Number,
    foreignPassport: pii.foreignPassportNumber,
    passportCountry: submission.passportCountry,
    authExpDate: submission.authExpDate?.toISOString() ?? null,
    signatureDate: submission.signatureDate.toISOString(),
    docChoice: submission.docChoice,
    listADoc: submission.listADoc,
    listADocNumber: submission.listADocNumber,
    listAExpDate: submission.listAExpDate?.toISOString() ?? null,
    listAIssuingAuthority: submission.listAIssuingAuthority,
    listBDoc: submission.listBDoc,
    listBDocNumber: submission.listBDocNumber,
    listBExpDate: submission.listBExpDate?.toISOString() ?? null,
    listBIssuingAuthority: submission.listBIssuingAuthority,
    listCDoc: submission.listCDoc,
    listCDocNumber: submission.listCDocNumber,
    listCExpDate: submission.listCExpDate?.toISOString() ?? null,
    listCIssuingAuthority: submission.listCIssuingAuthority,
    employerName: config.employerName,
    employerTitle: config.employerTitle,
    employerBusinessName: config.employerBusinessName,
    employerBusinessAddress: config.employerBusinessAddress,
    firstDayEmployed: submission.createdAt.toISOString(),
  };
}
