import { Job } from 'bullmq';
import { JobData } from '../types';
import { createWorkspace, findUserByEmail, addUnnamedResource, KANTATA_ROLE_IDS } from '../lib/kantata';
import logger from '../logger';

const IS_TEST = process.env.NODE_ENV !== 'production';
const FALLBACK_KANTATA_USER_ID = '6397287'; // ryan@engage2learn.org

export async function createKantataProject(job: Job<JobData>): Promise<void> {
  const { opportunityId, opportunityName, accountName, amount, startDate, endDate, description, ownerEmail } =
    job.data;

  logger.info({ opportunityId }, 'Step 1: createKantataProject starting');

  const title = IS_TEST ? `TEST - ${opportunityName}` : opportunityName;

  const providerLeadId = await findUserByEmail(ownerEmail).catch(() => null)
    ?? FALLBACK_KANTATA_USER_ID;

  if (providerLeadId === FALLBACK_KANTATA_USER_ID) {
    logger.warn(
      { opportunityId, ownerEmail },
      'Step 1: Could not find Kantata user for owner email, falling back to default user'
    );
  }

  const projectDescription = [
    description,
    job.data.billingAddress ? `Billing Address: ${job.data.billingAddress}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const workspace = await createWorkspace({
      title,
      price: amount,
      start_date: startDate,
      due_date: endDate,
      description: projectDescription || undefined,
      client_role_name: accountName,
      primary_maven_id: providerLeadId,
      custom_fields: [
        { custom_field_id: '918965', value: opportunityId },
      ],
    });

    await addUnnamedResource(workspace.id, KANTATA_ROLE_IDS.COACH);
    logger.info({ opportunityId, kantataProjectId: workspace.id }, 'Step 1: Coach unnamed resource added');

    await job.updateData({ ...job.data, kantataProjectId: workspace.id });
    logger.info(
      { opportunityId, kantataProjectId: workspace.id },
      'Step 1: Kantata project created'
    );
  } catch (err: any) {
    const isDuplicate = err.response?.data?.errors?.some((e: any) =>
      e.message?.includes('has already been entered')
    );
    if (isDuplicate) {
      logger.info(
        { opportunityId },
        'Step 1: Kantata project already exists (duplicate SF ID), skipping'
      );
      return;
    }
    throw err;
  }
}
