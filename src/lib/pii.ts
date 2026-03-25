import { encrypt, decrypt } from "@/lib/integrations/encryption";

function getDataKey(): string {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "DATA_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32"
    );
  }
  return key;
}

/** Encrypt a PII field value. Returns encrypted string. */
export function encryptPii(value: string): string {
  return encrypt(value, getDataKey());
}

/** Decrypt a PII field value. Returns plaintext. */
export function decryptPii(encrypted: string): string {
  return decrypt(encrypted, getDataKey());
}

/** Encrypt a value if non-empty, otherwise return null. */
export function encryptPiiOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return encryptPii(value);
}

/** Decrypt a value if non-null, otherwise return null. */
export function decryptPiiOrNull(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  return decryptPii(encrypted);
}

/**
 * Decrypt a full submission record's PII fields in place.
 * Returns a plain object with decrypted values for display.
 */
export interface DecryptedSubmissionPii {
  address: string;
  aptUnit: string | null;
  city: string;
  zip: string;
  dob: string;
  ssn: string | null;
  ssnLast4: string | null;
  email: string;
  phone: string | null;
  alienRegNumber: string | null;
  i94Number: string | null;
  foreignPassportNumber: string | null;
}

export function decryptSubmissionPii(submission: {
  encryptedAddress: string;
  encryptedAptUnit: string | null;
  encryptedCity: string;
  encryptedZip: string;
  encryptedDob: string;
  encryptedSsn?: string | null;
  encryptedSsnLast4: string | null;
  encryptedEmail: string;
  encryptedPhone: string | null;
  encryptedAlienRegNumber: string | null;
  encryptedI94Number: string | null;
  encryptedForeignPassport: string | null;
}): DecryptedSubmissionPii {
  return {
    address: decryptPii(submission.encryptedAddress),
    aptUnit: decryptPiiOrNull(submission.encryptedAptUnit),
    city: decryptPii(submission.encryptedCity),
    zip: decryptPii(submission.encryptedZip),
    dob: decryptPii(submission.encryptedDob),
    ssn: decryptPiiOrNull(submission.encryptedSsn ?? null),
    ssnLast4: decryptPiiOrNull(submission.encryptedSsnLast4),
    email: decryptPii(submission.encryptedEmail),
    phone: decryptPiiOrNull(submission.encryptedPhone),
    alienRegNumber: decryptPiiOrNull(submission.encryptedAlienRegNumber),
    i94Number: decryptPiiOrNull(submission.encryptedI94Number),
    foreignPassportNumber: decryptPiiOrNull(submission.encryptedForeignPassport),
  };
}
