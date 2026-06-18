import 'dotenv/config';
import { Worker } from 'bullmq';
import { connection } from './queue';
import { JobData } from './types';
import { createKantataProject } from './jobs/createKantataProject';
import { createKantataTasks } from './jobs/createKantataTasks';
import { createDriveFolder } from './jobs/createDriveFolder';
import { writebackToSalesforce } from './jobs/writebackToSalesforce';
import logger from './logger';

const worker = new Worker<JobData>(
  'opportunity-processing',
  async (job) => {
    logger.info({ jobId: job.id, opportunityId: job.data.opportunityId }, 'Job started');

    await createKantataProject(job);
    await createKantataTasks(job);
    await createDriveFolder(job);
    await writebackToSalesforce(job);

    logger.info({ jobId: job.id, opportunityId: job.data.opportunityId }, 'Job completed');
  },
  { connection }
);

worker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, opportunityId: job?.data.opportunityId, err: err.message },
    'Job failed'
  );
});

worker.on('error', (err) => {
  logger.error({ err: err.message }, 'Worker error');
});

logger.info('Worker started, waiting for jobs...');
