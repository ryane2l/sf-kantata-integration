import { Job } from 'bullmq';
import { JobData } from '../types';
import {
  findWorkspaceByExternalReference,
  createWorkspace,
} from '../lib/kantata';
import logger from '../logger';

export async function createKantataProject(job: Job<JobData>): Promise<void> {
  const { opportunityId, opportunityName, amount, startDate, endDate, description } =
    job.data;

  logger.info({ opportunityId }, 'Step 1: createKantataProject starting');

  const existing = await findWorkspaceByExternalReference(opportunityId);
  if (existing) {
    logger.info(
      { opportunityId, kantataProjectId: existing.id },
      'Step 1: Kantata project already exists, skipping creation'
    );
    await job.updateData({ ...job.data, kantataProjectId: existing.id });
    return;
  }

  const workspace = await createWorkspace({
    title: opportunityName,
    price: amount,
    start_date: startDate,
    due_date: endDate,
    description: description,
    external_reference: opportunityId,
  });

  await job.updateData({ ...job.data, kantataProjectId: workspace.id });
  logger.info(
    { opportunityId, kantataProjectId: workspace.id },
    'Step 1: Kantata project created'
  );
}
