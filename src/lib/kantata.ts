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
  custom_fields?: Array<{ custom_field_id: string; value: string }>;
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
