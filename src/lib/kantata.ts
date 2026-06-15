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

export async function findWorkspaceByExternalReference(
  ref: string
): Promise<KantataWorkspace | null> {
  const res = await kantataClient.get<{ workspaces: KantataWorkspace[] }>(
    '/workspaces',
    { params: { external_reference: ref } }
  );
  const workspaces = res.data.workspaces ?? [];
  return workspaces.length > 0 ? workspaces[0] : null;
}

export async function createWorkspace(params: {
  title: string;
  price: number;
  start_date: string;
  external_reference: string;
}): Promise<KantataWorkspace> {
  const res = await kantataClient.post<{ workspaces: KantataWorkspace[] }>(
    '/workspaces',
    { workspaces: [params] }
  );
  const workspace = res.data.workspaces?.[0];
  if (!workspace) throw new Error('Kantata returned no workspace in response');
  return workspace;
}
