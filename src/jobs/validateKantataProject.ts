import { Job } from 'bullmq';
import { JobData, LineItem } from '../types';
import {
  getWorkspace,
  getWorkspaceCustomFieldValues,
  getWorkspaceStoryCount,
  KANTATA_CUSTOM_FIELD_IDS,
  COMPANY_ENGAGE2LEARN_CHOICE_ID,
} from '../lib/kantata';
import { notify } from '../lib/notify';
import logger from '../logger';

// Must stay in sync with createKantataTasks.ts
const ONSITE_PRODUCT_CODES = new Set([
  'CA-CAC-01', 'CA-CAT-01', 'CA-TOT-01', 'CP-AIP-01', 'CP-AIP-02',
  'TC-ETT-01', 'CC-OGT-02', 'SD-DDY-01', 'EC-EET-01',
]);
const SKIP_PRODUCT_CODES = new Set(['OT-TRV-01']);
const PM_PRODUCT_CODES = new Set(['PM-PMG-01', 'PM-PMG-40', 'PM-PMG-5']);

function expectedTaskCount(lineItems: LineItem[]): number {
  const seenPmCodes = new Set<string>();
  let count = 0;
  for (const li of lineItems) {
    const code = li.productCode ?? '';
    if (SKIP_PRODUCT_CODES.has(code)) continue;
    if (PM_PRODUCT_CODES.has(code)) {
      if (!seenPmCodes.has(code)) { seenPmCodes.add(code); count++; }
    } else {
      count += Math.ceil(li.quantity);
    }
  }
  return count;
}

function expectedOnsiteDays(lineItems: LineItem[]): number {
  return lineItems
    .filter((li) => ONSITE_PRODUCT_CODES.has(li.productCode ?? ''))
    .reduce((sum, li) => sum + Math.ceil(li.quantity), 0);
}

export async function validateKantataProject(job: Job<JobData>): Promise<void> {
  const {
    opportunityId, opportunityName, kantataProjectId,
    amount, startDate, endDate, state, lineItems = [],
  } = job.data;

  if (!kantataProjectId) {
    logger.warn({ opportunityId }, 'Step 3: validateKantataProject skipped — no kantataProjectId');
    return;
  }

  logger.info({ opportunityId, kantataProjectId }, 'Step 3: validateKantataProject starting');

  const issues: string[] = [];

  const [workspace, cfvs, storyCount] = await Promise.all([
    getWorkspace(kantataProjectId),
    getWorkspaceCustomFieldValues(kantataProjectId),
    getWorkspaceStoryCount(kantataProjectId),
  ]);

  // Title
  if (!workspace.title.includes(opportunityName)) {
    issues.push(`Title mismatch: expected to contain "${opportunityName}", got "${workspace.title}"`);
  }

  // Price (allow ±100 cents / $1 for rounding — SF amounts sometimes have fractional cents)
  const expectedCents = Math.round(amount * 100);
  if (Math.abs(workspace.price_in_cents - expectedCents) > 100) {
    issues.push(`Price mismatch: expected $${amount} (${expectedCents}¢), got ${workspace.price_in_cents}¢`);
  }

  // Dates
  if (workspace.start_date !== startDate) {
    issues.push(`Start date mismatch: expected ${startDate}, got ${workspace.start_date}`);
  }
  if (workspace.due_date !== endDate) {
    issues.push(`End date mismatch: expected ${endDate}, got ${workspace.due_date}`);
  }

  // Additional line items flag
  if (workspace.actual_fees_includes_additional_line_items !== false) {
    issues.push(`"Include Additional Line Items in Actual Fees" is enabled — expected off`);
  }

  // Build a lookup from custom_field_id → value for quick access
  const cfvMap = new Map(cfvs.map((c) => [c.custom_field_id, c.value]));

  // SF Opportunity ID
  const sfIdOnProject = cfvMap.get(KANTATA_CUSTOM_FIELD_IDS.SALESFORCE_OPPORTUNITY_ID);
  if (String(sfIdOnProject) !== opportunityId) {
    issues.push(`SF Opportunity ID mismatch: expected "${opportunityId}", got "${sfIdOnProject}"`);
  }

  // Company — should always be engage2learn
  const companyVal = cfvMap.get(KANTATA_CUSTOM_FIELD_IDS.COMPANY_PROJECT);
  const companyIds: number[] = Array.isArray(companyVal) ? companyVal : [];
  if (!companyIds.includes(COMPANY_ENGAGE2LEARN_CHOICE_ID)) {
    issues.push(`Company field not set to engage2learn (choice ID ${COMPANY_ENGAGE2LEARN_CHOICE_ID})`);
  }

  // State — warn if state was provided but field is missing
  if (state) {
    const stateVal = cfvMap.get(KANTATA_CUSTOM_FIELD_IDS.STATE);
    if (!stateVal || (Array.isArray(stateVal) && stateVal.length === 0)) {
      issues.push(`State field is empty — "${state}" from Salesforce did not map to a Kantata choice`);
    }
  }

  // Total Onsite Days
  const expectedDays = expectedOnsiteDays(lineItems);
  const onsiteDaysVal = cfvMap.get(KANTATA_CUSTOM_FIELD_IDS.TOTAL_ONSITE_DAYS);
  if (expectedDays > 0 && Number(onsiteDaysVal) !== expectedDays) {
    issues.push(`Total Onsite Days mismatch: expected ${expectedDays}, got ${onsiteDaysVal}`);
  }

  // Task count
  const expectedTasks = expectedTaskCount(lineItems);
  if (storyCount !== expectedTasks) {
    issues.push(`Task count mismatch: expected ${expectedTasks}, got ${storyCount}`);
  }

  if (issues.length === 0) {
    logger.info({ opportunityId, kantataProjectId }, 'Step 3: All validation checks passed');
    return;
  }

  // Something needs attention
  const kantataUrl = `https://app.kantata.com/workspaces/${kantataProjectId}`;
  const body = [
    `Opportunity: ${opportunityName}`,
    `Salesforce ID: ${opportunityId}`,
    `Kantata Project: ${kantataUrl}`,
    ``,
    `Issues found (${issues.length}):`,
    ...issues.map((i) => `  • ${i}`),
  ].join('\n');

  logger.warn({ opportunityId, kantataProjectId, issues }, 'Step 3: Validation issues found');

  await notify({
    subject: `[SF→Kantata] Validation issues: ${opportunityName}`,
    body,
  });
}
