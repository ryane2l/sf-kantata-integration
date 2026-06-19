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

// Company (Project) choices: 4542878=Education Elements, 4542879=PLC, 4542880=Tripod, 4542881=XanEdu, 5298687=engage2learn
export const COMPANY_ENGAGE2LEARN_CHOICE_ID = 5298687;

// State — all 50 states + DC + International
const STATE_CHOICES: Record<string, number> = {
  'Alabama': 5131117, 'Alaska': 5131118, 'Arizona': 5131119, 'Arkansas': 5131120,
  'California': 5131121, 'Colorado': 5131122, 'Connecticut': 5131123, 'Delaware': 5131124,
  'Florida': 5131125, 'Georgia': 5131126, 'Hawaii': 5131127, 'Idaho': 5131128,
  'Illinois': 5131129, 'Indiana': 5131130, 'Iowa': 5131131, 'Kansas': 5131132,
  'Kentucky': 5131133, 'Louisiana': 5131134, 'Maine': 5131135, 'Maryland': 5131136,
  'Massachusetts': 5131137, 'Michigan': 5131138, 'Minnesota': 5131139, 'Mississippi': 5131140,
  'Missouri': 5131141, 'Montana': 5131142, 'Nebraska': 5131143, 'Nevada': 5131144,
  'New Hampshire': 5131145, 'New Jersey': 5131146, 'New Mexico': 5131147, 'New York': 5131148,
  'North Carolina': 5131149, 'North Dakota': 5131150, 'Ohio': 5131151, 'Oklahoma': 5131152,
  'Oregon': 5131153, 'Pennsylvania': 5131154, 'Rhode Island': 5131155, 'South Carolina': 5131156,
  'South Dakota': 5131157, 'Tennessee': 5131158, 'Texas': 5131159, 'Utah': 5131160,
  'Vermont': 5131161, 'Virginia': 5131162, 'Washington': 5131163, 'West Virginia': 5131164,
  'Wisconsin': 5131165, 'Wyoming': 5131166, 'International': 5131167, 'Washington, D.C.': 5152737,
};

// EDPS — currently first names only in Kantata; won't match Salesforce full names until
// Kantata choices are updated to full names (e.g. "Jason" → "Jason Smith")
const EDPS_CHOICES: Record<string, number> = {
  'Jason': 5118577, 'Kelly': 5118578, 'Jill': 5203713,
  'Jentessa': 5283129, 'Jordan': 5283130, 'Robyn': 5283131, 'Liz': 5283132,
};

// DSP — also first names only; update Kantata choices to full names for proper matching
const DSP_CHOICES: Record<string, number> = {
  'Jason': 5283123, 'Nick': 5283124, 'Sterling': 5283126,
  'Ashley': 5283127, 'Emory': 5283128, 'Scott': 5298465,
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
