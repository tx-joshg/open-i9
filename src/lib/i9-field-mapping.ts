/**
 * Default I-9 PDF field mapping.
 *
 * Keys are our internal field names. Values are the PDF form field names
 * in the official USCIS I-9 form (Edition 01/20/25).
 *
 * When USCIS releases a new form version, upload the new PDF in
 * Admin > I-9 Form Management, use the field inspector to see the
 * new field names, and update the mapping.
 */

export interface I9FieldMapping {
  // Section 1 - Employee Info
  lastName: string;
  firstName: string;
  middleInitial: string;
  otherLastNames: string;
  address: string;
  aptUnit: string;
  city: string;
  state: string; // dropdown
  zip: string;
  dob: string;
  ssn: string;
  email: string;
  phone: string;

  // Citizenship checkboxes
  cbCitizen: string;
  cbNational: string;
  cbLpr: string;
  cbAuthorized: string;

  // Citizenship fields
  uscisNumber: string;
  authExpDate: string;
  i94Number: string;
  foreignPassport: string;

  // Signature
  employeeSignature: string;
  employeeSignatureDate: string;

  // Section 2 - List A
  listADocTitle: string;
  listAIssuingAuthority: string;
  listADocNumber: string;
  listAExpDate: string;

  // Section 2 - List B
  listBDocTitle: string;
  listBIssuingAuthority: string;
  listBDocNumber: string;
  listBExpDate: string;

  // Section 2 - List C
  listCDocTitle: string;
  listCIssuingAuthority: string;
  listCDocNumber: string;
  listCExpDate: string;

  // Section 2 - Employer
  firstDayEmployed: string;
  employerNameAndTitle: string;
  employerSignature: string;
  employerSignatureDate: string;
  employerBusinessName: string;
  employerBusinessAddress: string;

  // Section 2 - Employee name repeat
  section2LastName: string;
  section2FirstName: string;
  section2MiddleInitial: string;
}

export const DEFAULT_FIELD_MAPPING: I9FieldMapping = {
  // Section 1
  lastName: "Last Name (Family Name)",
  firstName: "First Name Given Name",
  middleInitial: "Employee Middle Initial (if any)",
  otherLastNames: "Employee Other Last Names Used (if any)",
  address: "Address Street Number and Name",
  aptUnit: "Apt Number (if any)",
  city: "City or Town",
  state: "State",
  zip: "ZIP Code",
  dob: "Date of Birth mmddyyyy",
  ssn: "US Social Security Number",
  email: "Employees E-mail Address",
  phone: "Telephone Number",

  // Citizenship checkboxes
  cbCitizen: "CB_1",
  cbNational: "CB_2",
  cbLpr: "CB_3",
  cbAuthorized: "CB_4",

  // Citizenship fields
  uscisNumber: "USCIS ANumber",
  authExpDate: "Exp Date mmddyyyy",
  i94Number: "Form I94 Admission Number",
  foreignPassport: "Foreign Passport Number and Country of IssuanceRow1",

  // Signature
  employeeSignature: "Signature of Employee",
  employeeSignatureDate: "Today's Date mmddyyy",

  // Section 2 - List A
  listADocTitle: "Document Title 1",
  listAIssuingAuthority: "Issuing Authority 1",
  listADocNumber: "Document Number 0 (if any)",
  listAExpDate: "Expiration Date if any",

  // Section 2 - List B
  listBDocTitle: "List B Document 1 Title",
  listBIssuingAuthority: "List B Issuing Authority 1",
  listBDocNumber: "List B Document Number 1",
  listBExpDate: "List B Expiration Date 1",

  // Section 2 - List C
  listCDocTitle: "List C Document Title 1",
  listCIssuingAuthority: "List C Issuing Authority 1",
  listCDocNumber: "List C Document Number 1",
  listCExpDate: "List C Expiration Date 1",

  // Section 2 - Employer
  firstDayEmployed: "FirstDayEmployed mmddyyyy",
  employerNameAndTitle: "Last Name First Name and Title of Employer or Authorized Representative",
  employerSignature: "Signature of Employer or AR",
  employerSignatureDate: "S2 Todays Date mmddyyyy",
  employerBusinessName: "Employers Business or Org Name",
  employerBusinessAddress: "Employers Business or Org Address",

  // Section 2 - Employee name repeat
  section2LastName: "Last Name Family Name from Section 1",
  section2FirstName: "First Name Given Name from Section 1",
  section2MiddleInitial: "Middle initial if any from Section 1",
};

/**
 * Merges a partial mapping (from DB) with the defaults.
 */
export function resolveFieldMapping(stored: Record<string, string>): I9FieldMapping {
  return { ...DEFAULT_FIELD_MAPPING, ...stored } as I9FieldMapping;
}
