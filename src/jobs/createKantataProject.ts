import { Job } from 'bullmq';
import { JobData } from '../types';
import { createWorkspace } from '../lib/kantata';
import logger from '../logger';

const IS_TEST = process.env.NODE_ENV !== 'production';

export async function createKantataProject(job: Job<JobData>): Promise<void> {
  const { opportunityId, opportunityName, accountName, amount, startDate, endDate, description } =
    job.data;

  logger.info({ opportunityId }, 'Step 1: createKantataProject starting');

  const title = IS_TEST ? `TEST - ${opportunityName}` : opportunityName;

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
      custom_fields: [
        { custom_field_id: '918965', value: opportunityId },
      ],
    });

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
