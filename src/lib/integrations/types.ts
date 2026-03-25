export type IntegrationPlatform = "quickbooks" | "xero" | "zoho" | "freshbooks";
export type RecordType = "employee" | "vendor";
export type SyncStatus = "synced" | "failed" | "pending";

export interface SyncResult {
  success: boolean;
  recordId?: string;
  error?: string;
}

export interface IntegrationAdapter {
  syncSubmission(submissionId: string, recordType: RecordType): Promise<SyncResult>;
}
