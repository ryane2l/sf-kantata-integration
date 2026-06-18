export interface LineItem {
  productName: string;
  productCode?: string;
  productFamily?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  serviceDate?: string;
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
  state?: string;
  description?: string;
  billingAddress?: string;
  type?: string;
  projectOwnerEmail: string;
  projectOwnerName: string;
  opOwnerEmail: string;
  opOwnerName: string;
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
  state?: string;
  description?: string;
  billingAddress?: string;
  type?: string;
  projectOwnerEmail: string;
  projectOwnerName: string;
  opOwnerEmail: string;
  opOwnerName: string;
  lineItems?: LineItem[];
  kantataProjectId?: string;
  driveFolderUrl?: string;
}
