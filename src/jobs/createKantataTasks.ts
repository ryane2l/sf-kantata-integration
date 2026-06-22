import { Job } from 'bullmq';
import { JobData, LineItem } from '../types';
import { createTask, KANTATA_TAG_NAMES } from '../lib/kantata';
import logger from '../logger';

// Product codes whose tasks get 8hr estimate, Onsite tag, and Coach assignment.
// Pending confirmation: SD-BTW-01 (Board Training Workshop), EC-EET-01 (e2L Leader Training)
const ONSITE_PRODUCT_CODES = new Set<string>([
  'CA-CAC-01', // e2L Coaching
  'CA-CAT-01', // e2L Coaches Academy Training
  'CA-TOT-01', // Trainer of Trainers
  'CP-AIP-01', // Curriculum Implementation / e2L Enterprise Coaching
  'CP-AIP-02', // e2L Coaching Package (per person add-on) - All In-Person
  'TC-ETT-01', // e2L Training
  'CC-OGT-02', // GroweLab Training Day (On-Site)
  'SD-DDY-01', // Design Day
  'EC-EET-01', // e2L Leader Training
]);

// Product codes to skip entirely (no tasks created).
// Populate once confirmed.
const SKIP_PRODUCT_CODES = new Set<string>([
  'OT-TRV-01', // Travel Reimbursements — cost absorbed into paired service item
]);

// Product codes whose tasks get the PM tag.
const PM_PRODUCT_CODES = new Set<string>([
  'PM-PMG-01',
  'PM-PMG-40',
  'PM-PMG-5',
]);

interface ResolvedLineItem extends LineItem {
  travelUnitPrice: number; // from paired travel line item, 0 if none
}

// Collapse multiple rows of the same PM product code into one entry with summed budget.
// The consolidated task appears where the first occurrence was in the list.
function consolidatePmItems(items: ResolvedLineItem[]): ResolvedLineItem[] {
  const pmTotals = new Map<string, { index: number; item: ResolvedLineItem; totalCents: number }>();
  const result: (ResolvedLineItem | null)[] = [];

  for (const item of items) {
    const code = item.productCode ?? '';
    if (PM_PRODUCT_CODES.has(code)) {
      const cents = Math.round((item.unitPrice + item.travelUnitPrice) * 100);
      if (pmTotals.has(code)) {
        pmTotals.get(code)!.totalCents += cents;
      } else {
        const index = result.length;
        result.push(null); // placeholder at first-occurrence position
        pmTotals.set(code, { index, item, totalCents: cents });
      }
    } else {
      result.push(item);
    }
  }

  // Fill placeholders with consolidated entries
  for (const { index, item, totalCents } of pmTotals.values()) {
    result[index] = { ...item, unitPrice: totalCents / 100, travelUnitPrice: 0, quantity: 1 };
  }

  return result.filter((x): x is ResolvedLineItem => x !== null);
}

function pairTravelItems(lineItems: LineItem[]): ResolvedLineItem[] {
  const resolved: ResolvedLineItem[] = [];

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];

    // Skip travel — it gets absorbed into the preceding item
    if (SKIP_PRODUCT_CODES.has(item.productCode ?? '')) continue;

    // Look ahead for a travel item with the same quantity
    let travelUnitPrice = 0;
    for (let j = i + 1; j < lineItems.length; j++) {
      const candidate = lineItems[j];
      if (candidate.productCode === 'OT-TRV-01' && candidate.quantity === item.quantity) {
        travelUnitPrice = candidate.unitPrice;
        break;
      }
      // Stop looking if we hit another non-travel, non-PM item with a different quantity
      // (signals we've moved into a new group)
      if (
        !SKIP_PRODUCT_CODES.has(candidate.productCode ?? '') &&
        candidate.productCode !== 'PM-PMG-01' &&
        candidate.quantity !== item.quantity
      ) {
        break;
      }
    }

    resolved.push({ ...item, travelUnitPrice });
  }

  return resolved;
}

export async function createKantataTasks(job: Job<JobData>): Promise<void> {
  const { opportunityId, kantataProjectId, coachResourceId, lineItems } = job.data;

  if (!kantataProjectId) {
    throw new Error('createKantataTasks: kantataProjectId missing — project must be created first');
  }

  if (job.data.stepsCompleted?.kantataTasks) {
    logger.info({ opportunityId, kantataProjectId }, 'Step 2: createKantataTasks already completed — skipping');
    return;
  }

  if (!lineItems || lineItems.length === 0) {
    logger.info({ opportunityId }, 'Step 2: No line items — skipping task creation');
    return;
  }

  logger.info({ opportunityId, kantataProjectId, itemCount: lineItems.length }, 'Step 2: createKantataTasks starting');

  const resolvedItems = consolidatePmItems(pairTravelItems(lineItems));
  let tasksCreated = 0;

  for (const item of resolvedItems) {
    const isOnsite = ONSITE_PRODUCT_CODES.has(item.productCode ?? '');
    const isPM = PM_PRODUCT_CODES.has(item.productCode ?? '');
    const budgetPerTaskCents = Math.round((item.unitPrice + item.travelUnitPrice) * 100);
    const timeEstimateMinutes = isOnsite ? 480 : undefined; // 8 hours
    const tagList = isOnsite
      ? KANTATA_TAG_NAMES.ONSITE
      : isPM
        ? KANTATA_TAG_NAMES.PM
        : undefined;

    const taskCount = Math.ceil(item.quantity);
    for (let n = 1; n <= taskCount; n++) {
      const cleanName = item.productName.replace(' (Gross)', '');
      const baseName = isOnsite ? `ONSITE: ${cleanName}` : cleanName;
      const title = taskCount > 1 ? `${baseName} ${n}` : baseName;

      await createTask({
        workspace_id: kantataProjectId,
        title,
        story_type: 'deliverable',
        budget_estimate_in_cents: budgetPerTaskCents > 0 ? budgetPerTaskCents : undefined,
        time_estimate_in_minutes: timeEstimateMinutes,
        tag_list: tagList,
        assignees: isOnsite && coachResourceId
          ? [{ workspace_resource_id: parseInt(coachResourceId, 10) }]
          : undefined,
      });

      tasksCreated++;
    }

    logger.info(
      { opportunityId, productCode: item.productCode, quantity: item.quantity, tasksCreatedForItem: taskCount, isOnsite },
      `Step 2: Created ${taskCount} task(s) for ${item.productName}`
    );
  }

  await job.updateData({
    ...job.data,
    stepsCompleted: { ...job.data.stepsCompleted, kantataTasks: true },
  });
  logger.info({ opportunityId, kantataProjectId, tasksCreated }, 'Step 2: Task creation complete');
}
