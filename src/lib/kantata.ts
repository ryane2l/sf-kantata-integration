import axios from 'axios';
import 'dotenv/config';

const kantataClient = axios.create({
  baseURL: 'https://api.mavenlink.com/api/v1',
  headers: {
    Authorization: `Bearer ${process.env.KANTATA_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

export interface KantataWorkspace {
  id: string;
  title: string;
  external_reference?: string;
}

export async function findWorkspaceBySalesforceId(
  opportunityId: string
): Promise<KantataWorkspace | null> {
  // Search custom_field_values for subject_type=workspace matching our SF opportunity ID
  const res = await kantataClient.get<{
    custom_field_values: Record<string, {
      subject_type: string;
      subject_id: number;
      custom_field_id: string;
      value: unknown;
    }>;
  }>('/custom_field_values', {
    params: {
      subject_type: 'workspace',
      per_page: 200,
    },
  });

  const match = Object.values(res.data.custom_field_values ?? {}).find(
    (cfv) => cfv.custom_field_id === '918965' && String(cfv.value) === opportunityId
  );

  if (!match) return null;

  const wsRes = await kantataClient.get<{ workspaces: Record<string, KantataWorkspace> }>(
    `/workspaces/${match.subject_id}`
  );
  return Object.values(wsRes.data.workspaces ?? {})[0] ?? null;
}

export interface CreateWorkspaceParams {
  title: string;
  price: number;
  start_date: string;
  due_date: string;
  description?: string;
  client_role_name?: string;
  primary_maven_id?: string;
  custom_fields?: Array<{ custom_field_id: string; value: unknown }>;
}

export async function createWorkspace(
  params: CreateWorkspaceParams
): Promise<KantataWorkspace> {
  const res = await kantataClient.post<{ workspaces: Record<string, KantataWorkspace> }>(
    '/workspaces',
    { workspaces: [params] }
  );
  const workspace = Object.values(res.data.workspaces ?? {})[0];
  if (!workspace) throw new Error('Kantata returned no workspace in response');
  return workspace;
}

export const KANTATA_ROLE_IDS = {
  COACH: '1653501',
  MANAGING_DIRECTOR: '1630161',
} as const;

export const KANTATA_CUSTOM_FIELD_IDS = {
  SALESFORCE_OPPORTUNITY_ID: '918965',
  EDPS: '930535',
  DSP: '939359',
  STATE: '932555',
  COMPANY_PROJECT: '904413',
  TOTAL_ONSITE_DAYS: '939669',
} as const;

// Company (Project) — active choice IDs: 4542878, 4542881
// 4542878 = engage2learn (most common on existing projects)
// 4542881 = unknown — confirm in Kantata Settings → Custom Fields
export const COMPANY_ENGAGE2LEARN_CHOICE_ID = 4542878;

// State field — 21 active choices (5131117–5131137)
// Populate once user confirms order in Kantata Settings → Custom Fields → State
const STATE_CHOICES: Record<string, number> = {
  // 'Texas': 5131117,
  // 'Georgia': 5131118,
  // ... fill in from Kantata UI
};

// EDPS active choice IDs: 5118577, 5118578, 5203713, 5283129, 5283130, 5283131, 5283132
// DSP  active choice IDs: 5283123, 5283124, 5283125, 5283126, 5283127, 5283128, 5298465
// Populate once user confirms name order in Kantata Settings → Custom Fields
const EDPS_CHOICES: Record<string, number> = {
  // 'Diana Branch': 5118577,
};
const DSP_CHOICES: Record<string, number> = {
  // 'Diana Branch': 5283123,
};

export function lookupEdpsChoiceId(name: string): number | null {
  return EDPS_CHOICES[name] ?? null;
}

export function lookupDspChoiceId(name: string): number | null {
  return DSP_CHOICES[name] ?? null;
}

export function lookupStateChoiceId(state: string): number | null {
  return STATE_CHOICES[state] ?? null;
}

export const KANTATA_TAG_NAMES = {
  ONSITE: 'Onsite',
  PM: 'PM',
} as const;

export async function addUnnamedResource(
  workspaceId: string,
  roleId: string
): Promise<string> {
  const res = await kantataClient.post<{
    workspace_resources: Record<string, { id: string; role_id: string }>;
  }>('/workspace_resources', {
    workspace_resource: {
      workspace_id: parseInt(workspaceId, 10),
      user_id: null,
      role_id: parseInt(roleId, 10),
    },
  });
  const resource = Object.values(res.data.workspace_resources ?? {})[0];
  if (!resource) throw new Error('Kantata returned no workspace_resource in response');
  return resource.id;
}

export async function addNamedMember(
  workspaceId: string,
  userId: string,
  roleId: string
): Promise<string> {
  const res = await kantataClient.post<{
    workspace_resources: Record<string, { id: string }>;
  }>('/workspace_resources', {
    workspace_resource: {
      workspace_id: parseInt(workspaceId, 10),
      user_id: parseInt(userId, 10),
      role_id: parseInt(roleId, 10),
    },
  });
  const resource = Object.values(res.data.workspace_resources ?? {})[0];
  if (!resource) throw new Error('Kantata returned no workspace_resource in response');
  return resource.id;
}

export interface CreateTaskParams {
  workspace_id: string;
  title: string;
  story_type: 'deliverable' | 'task';
  budget_estimate_in_cents?: number;
  time_estimate_in_minutes?: number;
  tag_list?: string;
  parent_id?: string;
  assignees?: Array<{ workspace_resource_id: number }>;
}

export async function createTask(params: CreateTaskParams): Promise<string> {
  const res = await kantataClient.post<{ stories: Record<string, { id: string }> }>(
    '/stories',
    { story: params }
  );
  const story = Object.values(res.data.stories ?? {})[0];
  if (!story) throw new Error('Kantata returned no story in response');
  return story.id;
}

export async function findUserByEmail(email: string): Promise<string | null> {
  const res = await kantataClient.get<{ users: Record<string, { id: string; email_address: string }> }>(
    '/users',
    { params: { search: email, per_page: 10 } }
  );
  const match = Object.values(res.data.users ?? {}).find(
    (u) => u.email_address.toLowerCase() === email.toLowerCase()
  );
  return match?.id ?? null;
}
