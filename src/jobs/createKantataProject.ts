import { Job } from 'bullmq';
import { JobData } from '../types';
import {
  createWorkspace,
  findUserByEmail,
  addUnnamedResource,
  addNamedMember,
  KANTATA_ROLE_IDS,
  KANTATA_CUSTOM_FIELD_IDS,
} from '../lib/kantata';
import logger from '../logger';

const IS_TEST = process.env.NODE_ENV !== 'production';
const FALLBACK_KANTATA_USER_ID = '6397287'; // ryan@engage2learn.org

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
    // EDPS (930535), DSP (939359), and State (932555) are dropdown fields requiring choice IDs.
    // Choice ID mapping is pending — will be added once resolved.
    const customFields: Array<{ custom_field_id: string; value: string }> = [
      { custom_field_id: KANTATA_CUSTOM_FIELD_IDS.SALESFORCE_OPPORTUNITY_ID, value: opportunityId },
    ];

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
