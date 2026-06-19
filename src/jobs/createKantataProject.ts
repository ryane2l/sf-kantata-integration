import { Job } from 'bullmq';
import { JobData } from '../types';
import {
  createWorkspace,
  findUserByEmail,
  addUnnamedResource,
  addNamedMember,
  lookupEdpsChoiceId,
  lookupDspChoiceId,
  lookupStateChoiceId,
  KANTATA_ROLE_IDS,
  KANTATA_CUSTOM_FIELD_IDS,
  COMPANY_ENGAGE2LEARN_CHOICE_ID,
} from '../lib/kantata';
import { LineItem } from '../types';
import logger from '../logger';

const IS_TEST = process.env.NODE_ENV !== 'production';
const FALLBACK_KANTATA_USER_ID = '6397287'; // ryan@engage2learn.org

// Product codes counted toward Total Onsite Days — kept in sync with createKantataTasks.ts
const ONSITE_PRODUCT_CODES = new Set([
  'CA-CAC-01', 'CA-CAT-01', 'CA-TOT-01', 'CP-AIP-01', 'CP-AIP-02',
  'TC-ETT-01', 'CC-OGT-02', 'SD-DDY-01', 'EC-EET-01',
]);

function calcTotalOnsiteDays(lineItems: LineItem[]): number {
  return lineItems
    .filter((li) => ONSITE_PRODUCT_CODES.has(li.productCode ?? ''))
    .reduce((sum, li) => sum + Math.ceil(li.quantity), 0);
}

export async function createKantataProject(job: Job<JobData>): Promise<void> {
  const {
    opportunityId, opportunityName, accountName, amount, startDate, endDate,
    description, billingAddress, projectOwnerEmail, opOwnerEmail, state,
  } = job.data;

  logger.info({ opportunityId }, 'Step 1: createKantataProject starting');

  const title = IS_TEST ? `TEST - ${opportunityName}` : opportunityName;

  const [providerLeadId, dspUserId] = await Promise.all([
    findUserByEmail(projectOwnerEmail).catch(() => null),
    opOwnerEmail !== projectOwnerEmail
      ? findUserByEmail(opOwnerEmail).catch(() => null)
      : Promise.resolve(null),
  ]);

  const resolvedProviderLeadId = providerLeadId ?? FALLBACK_KANTATA_USER_ID;
  if (!providerLeadId) {
    logger.warn({ opportunityId, projectOwnerEmail }, 'Step 1: Could not find Kantata user for projectOwnerEmail, falling back to default');
  }

  const projectDescription = [
    description,
    billingAddress ? `Billing Address: ${billingAddress}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const customFields: Array<{ custom_field_id: string; value: unknown }> = [
      { custom_field_id: KANTATA_CUSTOM_FIELD_IDS.SALESFORCE_OPPORTUNITY_ID, value: opportunityId },
      { custom_field_id: KANTATA_CUSTOM_FIELD_IDS.COMPANY_PROJECT, value: [COMPANY_ENGAGE2LEARN_CHOICE_ID] },
    ];

    const edpsId = lookupEdpsChoiceId(job.data.projectOwnerName);
    if (edpsId) {
      customFields.push({ custom_field_id: KANTATA_CUSTOM_FIELD_IDS.EDPS, value: [edpsId] });
    } else {
      logger.warn({ opportunityId, projectOwnerName: job.data.projectOwnerName }, 'Step 1: No EDPS choice ID found for name — skipping EDPS field');
    }

    const dspId = lookupDspChoiceId(job.data.opOwnerName);
    if (dspId) {
      customFields.push({ custom_field_id: KANTATA_CUSTOM_FIELD_IDS.DSP, value: [dspId] });
    } else {
      logger.warn({ opportunityId, opOwnerName: job.data.opOwnerName }, 'Step 1: No DSP choice ID found for name — skipping DSP field');
    }

    const stateId = state ? lookupStateChoiceId(state) : null;
    if (stateId) {
      customFields.push({ custom_field_id: KANTATA_CUSTOM_FIELD_IDS.STATE, value: [stateId] });
    } else if (state) {
      logger.warn({ opportunityId, state }, 'Step 1: No State choice ID found — skipping State field');
    }

    const totalOnsiteDays = calcTotalOnsiteDays(job.data.lineItems ?? []);
    if (totalOnsiteDays > 0) {
      customFields.push({ custom_field_id: KANTATA_CUSTOM_FIELD_IDS.TOTAL_ONSITE_DAYS, value: totalOnsiteDays });
    }

    const workspace = await createWorkspace({
      title,
      price: amount,
      start_date: startDate,
      due_date: endDate,
      description: projectDescription || undefined,
      client_role_name: accountName,
      primary_maven_id: resolvedProviderLeadId,
      custom_fields: customFields,
    });

    const coachResourceId = await addUnnamedResource(workspace.id, KANTATA_ROLE_IDS.COACH);
    logger.info({ opportunityId, kantataProjectId: workspace.id }, 'Step 1: Coach unnamed resource added');

    // Add projectOwner as Managing Director (they're already Provider Lead via primary_maven_id)
    await addNamedMember(workspace.id, resolvedProviderLeadId, KANTATA_ROLE_IDS.MANAGING_DIRECTOR)
      .catch((err) => logger.warn({ opportunityId, err: err.message }, 'Step 1: Could not add Managing Director — continuing'));

    // Add DSP user as workspace member if different from EDPS
    if (dspUserId && dspUserId !== resolvedProviderLeadId) {
      await addNamedMember(workspace.id, dspUserId, KANTATA_ROLE_IDS.MANAGING_DIRECTOR)
        .catch((err) => logger.warn({ opportunityId, err: err.message }, 'Step 1: Could not add DSP user — continuing'));
    }

    await job.updateData({ ...job.data, kantataProjectId: workspace.id, coachResourceId });
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
