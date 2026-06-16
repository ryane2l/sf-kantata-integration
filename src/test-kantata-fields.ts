import 'dotenv/config';
import axios from 'axios';

const kantataClient = axios.create({
  baseURL: 'https://api.mavenlink.com/api/v1',
  headers: {
    Authorization: `Bearer ${process.env.KANTATA_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function run() {
  // Fetch a single existing workspace to see all available fields
  const res = await kantataClient.get('/workspaces', {
    params: { per_page: 1 },
  });

  const workspaces = res.data.workspaces ?? {};
  const firstKey = Object.keys(workspaces)[0];
  const workspace = workspaces[firstKey];

  if (!workspace) {
    console.log('No workspaces found in Kantata — cannot inspect fields.');
    return;
  }

  console.log('\n=== Available Kantata Workspace Fields ===\n');
  Object.entries(workspace).forEach(([key, value]) => {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  });

  // Also fetch custom field descriptors if available
  console.log('\n=== Fetching Custom Field Descriptors ===\n');
  try {
    const cfRes = await kantataClient.get('/custom_field_values', {
      params: { per_page: 1, subject_type: 'Workspace' },
    });
    console.log(JSON.stringify(cfRes.data, null, 2));
  } catch (err: any) {
    console.log('Custom field values endpoint:', err.response?.data ?? err.message);
  }
}

run().catch((err) => {
  console.error('Error:', err.response?.data ?? err.message);
  process.exit(1);
});
