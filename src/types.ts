export interface LineItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  serviceDate?: string;
  productName: string;
  productCode?: string;
  productFamily?: string;
}

export interface OpportunityPayload {
  opportunityId: string;
  opportunityName: string;
  accountName: string;
  amount: number;
  closeDate: string;
  startDate: string;
  endDate: string;
  stageName: string;
  description?: string;
  type?: string;
  ownerEmail: string;
  ownerName: string;
  lineItems?: LineItem[];
}

export interface JobData {
  opportunityId: string;
  opportunityName: string;
  accountName: string;
  amount: number;
  closeDate: string;
  startDate: string;
  endDate: string;
  stageName: string;
  description?: string;
  type?: string;
  ownerEmail: string;
  ownerName: string;
  lineItems?: LineItem[];
  kantataProjectId?: string;
  driveFolderUrl?: string;
}
