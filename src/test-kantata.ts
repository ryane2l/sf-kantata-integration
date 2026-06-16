import 'dotenv/config';
import { createKantataProject } from './jobs/createKantataProject';
import logger from './logger';

const mockJob: any = {
  data: {
    opportunityId: '006Vy00001ZuDVlIAN-TEST-FINAL',
    opportunityName: 'Loudoun County Public Schools | VA | Profile of A Leader Add On | 25-26',
    accountName: 'Loudoun County Public Schools',
    billingAddress: '21000 Education Ct, Broadlands, Virginia 20148, United States',
    amount: 8000,
    closeDate: '2026-05-27',
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    stageName: 'Closed Won',
    ownerEmail: 'natalie.woods@engage2learn.org',
    ownerName: 'Natalie Woods',
    lineItems: [],
  },
  updateData(newData: any) {
    this.data = newData;
    return Promise.resolve();
  },
};

async function run() {
  logger.info('Running Kantata project creation test...');
  await createKantataProject(mockJob);
  logger.info({ kantataProjectId: mockJob.data.kantataProjectId }, 'Test complete');
}

run().catch((err) => {
  logger.error({ err: err.message, response: err.response?.data }, 'Test failed');
  process.exit(1);
});
