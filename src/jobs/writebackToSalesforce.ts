import { Job } from 'bullmq';
import { JobData } from '../types';
import logger from '../logger';

// PLACEHOLDER — Salesforce write-back is not yet implemented.
// Team decision required before enabling. See PRODUCTION_CHECKLIST.md.
//
// When ready to implement:
// 1. Confirm Kantata_Project_ID__c and Drive_Folder_URL__c custom fields exist in SF
// 2. Confirm the SF integration user has edit access to those fields
// 3. Uncomment lib/salesforce.ts usage below and remove this notice
// 4. Update .env with SF credentials (prefer OAuth Connected App over username/password)

export async function writebackToSalesforce(job: Job<JobData>): Promise<void> {
  const { opportunityId, kantataProjectId, driveFolderUrl } = job.data;

  logger.info(
    { opportunityId, kantataProjectId, driveFolderUrl },
    'Step 3: writebackToSalesforce skipped (not yet implemented — see PRODUCTION_CHECKLIST.md)'
  );

  // TODO: implement write-back
  // await updateOpportunity(opportunityId, {
  //   Kantata_Project_ID__c: kantataProjectId,
  //   Drive_Folder_URL__c: driveFolderUrl,
  // });
}
