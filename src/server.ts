import 'dotenv/config';
import express, { Request, Response } from 'express';
import { opportunityQueue } from './queue';
import { OpportunityPayload, JobData } from './types';
import logger from './logger';

const app = express();
app.use(express.json());

app.post('/webhook/opportunity-won', async (req: Request, res: Response) => {
  const secret = req.headers['x-webhook-secret'];
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = req.body as OpportunityPayload;
  if (!payload.opportunityId || !payload.opportunityName) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const jobData: JobData = {
    opportunityId: payload.opportunityId,
    opportunityName: payload.opportunityName,
    accountName: payload.accountName,
    amount: payload.amount,
    closeDate: payload.closeDate,
    startDate: payload.startDate,
    endDate: payload.endDate,
    stageName: payload.stageName,
    state: payload.state,
    description: payload.description,
    billingAddress: payload.billingAddress,
    type: payload.type,
    projectOwnerEmail: payload.projectOwnerEmail,
    projectOwnerName: payload.projectOwnerName,
    opOwnerEmail: payload.opOwnerEmail,
    opOwnerName: payload.opOwnerName,
    lineItems: payload.lineItems ?? [],
  };

  await opportunityQueue.add('process-opportunity', jobData, {
    jobId: payload.opportunityId,
  });

  logger.info(
    { opportunityId: payload.opportunityId },
    'Opportunity enqueued'
  );

  res.status(202).json({ status: 'accepted', opportunityId: payload.opportunityId });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const port = parseInt(process.env.PORT ?? '3000', 10);
app.listen(port, () => {
  logger.info({ port }, 'Server listening');
});
