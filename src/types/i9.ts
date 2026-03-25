export type CitizenshipStatus = "usCitizen" | "usnational" | "lpr" | "authorized";
export type DocChoice = "listA" | "listBC";
export type SubmissionStatus = "pending_review" | "approved" | "rejected";
export type { RecordType, SyncStatus } from "@/lib/integrations/types";

export interface NotificationEmail {
  email: string;
  label: string;
}

export interface PortalConfig {
  id: number;
  businessName: string;
  logoFileKey: string | null;
  primaryColor: string;
  accentColor: string;
  notificationEmails: NotificationEmail[];
  footerText: string;
  welcomeMessage: string;
  sendEmployeeConfirmation: boolean;
  useEVerify: boolean | null; // null = not configured yet
  employerName: string;
  employerTitle: string;
  employerBusinessName: string;
  employerBusinessAddress: string;
}

export interface I9FormData {
  // Personal
  lastName: string;
  firstName: string;
  middleInitial: string;
  otherLastNames: string;
  address: string;
  aptUnit: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  ssn: string;
  email: string;
  phone: string;

  // Eligibility
  citizenshipStatus: CitizenshipStatus | "";
  alienRegNumber: string;
  i94Number: string;
  foreignPassportNumber: string;
  passportCountry: string;
  authExpDate: string;
  attestationChecked: boolean;
  signatureDataUrl: string;
  signatureDate: string;

  // Documents
  docChoice: DocChoice | "";
  listADoc: string;
  listADocNumber: string;
  listAExpDate: string;
  listAFileKey: string;
  listAIssuingAuthority: string;
  listBDoc: string;
  listBDocNumber: string;
  listBExpDate: string;
  listBFileKey: string;
  listBIssuingAuthority: string;
  listCDoc: string;
  listCDocNumber: string;
  listCExpDate: string;
  listCFileKey: string;
  listCIssuingAuthority: string;
}

export const LIST_A_DOCS = [
  "U.S. Passport",
  "U.S. Passport Card",
  "Permanent Resident Card (I-551)",
  "Foreign Passport with I-551 stamp",
  "Employment Authorization Document (I-766)",
  "Foreign Passport with Form I-94",
  "FSM/RMI Passport with I-94",
] as const;

export const LIST_B_DOCS = [
  "Driver's License",
  "State/Federal/Local Government ID",
  "School ID with Photo",
  "Voter Registration Card",
  "U.S. Military Card",
  "Military Dependent's ID",
  "USCG Merchant Mariner Document",
  "Native American Tribal Document",
  "Canadian Driver's License",
] as const;

export const LIST_C_DOCS = [
  "U.S. Social Security Card (unrestricted)",
  "Birth Certificate (DS-1350)",
  "U.S. Birth Certificate",
  "Native American Tribal Document",
  "Form I-197",
  "Form I-179",
  "DHS-issued Employment Authorization Document",
] as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP",
] as const;
