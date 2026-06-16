import 'dotenv/config';
import { opportunityQueue } from './queue';
import { queryClosedWonOpportunities } from './lib/salesforce';
import { JobData } from './types';
import logger from './logger';

async function run() {
  logger.info('Backfill starting — querying Salesforce for Closed Won opportunities');

  const opportunities = await queryClosedWonOpportunities();
  logger.info({ total: opportunities.length }, 'Opportunities found');

  let enqueued = 0;
  let skipped = 0;

  for (const opp of opportunities) {
    const jobData: JobData = {
      opportunityId: opp.Id,
      opportunityName: opp.Name,
      accountName: opp.Account?.Name ?? '',
      amount: opp.Amount,
      closeDate: opp.CloseDate,
      startDate: opp.Start_Date__c ?? opp.CloseDate,
      endDate: opp.End_Date__c ?? opp.CloseDate,
      stageName: opp.StageName,
      ownerEmail: opp.Owner?.Email ?? '',
      ownerName: opp.Owner?.Name ?? '',
      lineItems: [],
    };

    try {
      const job = await opportunityQueue.add('process-opportunity', jobData, {
        jobId: opp.Id,
      });

      if (job.id === opp.Id) {
        enqueued++;
      } else {
        skipped++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already exists')) {
        skipped++;
      } else {
        logger.error({ opportunityId: opp.Id, err: msg }, 'Failed to enqueue');
      }
    }
  }

  logger.info(
    { total: opportunities.length, enqueued, skipped },
    'Backfill complete'
  );

  process.exit(0);
}

run().catch((err) => {
  logger.error({ err: err.message }, 'Backfill failed');
  process.exit(1);
});
