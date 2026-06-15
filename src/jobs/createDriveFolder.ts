import { Job } from 'bullmq';
import { JobData } from '../types';
import { copyTemplateFolder, shareFolderWithWriter } from '../lib/google';
import logger from '../logger';

export async function createDriveFolder(job: Job<JobData>): Promise<void> {
  const { opportunityId, opportunityName, accountName, ownerEmail } = job.data;

  logger.info({ opportunityId }, 'Step 2: createDriveFolder starting');

  const templateFolderId = process.env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID;
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!templateFolderId || !parentFolderId) {
    throw new Error(
      'GOOGLE_DRIVE_TEMPLATE_FOLDER_ID and GOOGLE_DRIVE_PARENT_FOLDER_ID must be set'
    );
  }

  const folderName = `${accountName} — ${opportunityName}`;
  const newFolderId = await copyTemplateFolder({
    name: folderName,
    templateFolderId,
    parentFolderId,
  });

  await shareFolderWithWriter(newFolderId, ownerEmail);

  const driveFolderUrl = `https://drive.google.com/drive/folders/${newFolderId}`;
  await job.updateData({ ...job.data, driveFolderUrl });

  logger.info(
    { opportunityId, newFolderId, driveFolderUrl },
    'Step 2: Drive folder created and shared'
  );
}
