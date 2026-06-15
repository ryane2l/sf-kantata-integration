import jsforce from 'jsforce';
import 'dotenv/config';

let _conn: jsforce.Connection | null = null;

export async function getSalesforceConnection(): Promise<jsforce.Connection> {
  if (_conn) return _conn;

  const conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL ?? 'https://login.salesforce.com',
  });

  await conn.login(
    process.env.SF_USERNAME ?? '',
    (process.env.SF_PASSWORD ?? '') + (process.env.SF_SECURITY_TOKEN ?? '')
  );

  _conn = conn;
  return conn;
}

export async function updateOpportunity(
  opportunityId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const conn = await getSalesforceConnection();
  await conn.sobject('Opportunity').update({ Id: opportunityId, ...fields });
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount: number;
  CloseDate: string;
  StageName: string;
  Account: { Name: string };
  Owner: { Email: string; Name: string };
}

export async function queryClosedWonOpportunities(): Promise<SalesforceOpportunity[]> {
  const conn = await getSalesforceConnection();
  const result = await conn.query<SalesforceOpportunity>(
    `SELECT Id, Name, Account.Name, Amount, CloseDate, Owner.Email, Owner.Name
     FROM Opportunity
     WHERE StageName = 'Closed Won'`
  );
  return result.records;
}
