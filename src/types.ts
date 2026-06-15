export interface OpportunityPayload {
  opportunityId: string;
  opportunityName: string;
  accountName: string;
  amount: number;
  closeDate: string;
  ownerEmail: string;
  ownerName: string;
}

export interface JobData {
  opportunityId: string;
  opportunityName: string;
  accountName: string;
  amount: number;
  closeDate: string;
  ownerEmail: string;
  ownerName: string;
  kantataProjectId?: string;
  driveFolderUrl?: string;
}
