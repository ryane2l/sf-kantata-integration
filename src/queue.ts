import { Queue, ConnectionOptions } from 'bullmq';
import 'dotenv/config';

export const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
};

export const opportunityQueue = new Queue('opportunity-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});
