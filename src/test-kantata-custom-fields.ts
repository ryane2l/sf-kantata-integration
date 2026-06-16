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
  console.log('\n=== Kantata Custom Field Definitions (Workspace) ===\n');

  const res = await kantataClient.get('/custom_fields', {
    params: { subject_type: 'Workspace', per_page: 50 },
  });

  const fields = res.data.custom_fields ?? {};
  Object.values(fields).forEach((field: any) => {
    console.log(`  ID: ${field.id}`);
    console.log(`  Name: ${field.name}`);
    console.log(`  Type: ${field.type}`);
    console.log(`  Required: ${field.required}`);
    if (field.choices?.length) {
      console.log(`  Choices: ${field.choices.map((c: any) => c.value).join(', ')}`);
    }
    console.log('');
  });
}

run().catch((err) => {
  console.error('Error:', err.response?.data ?? err.message);
  process.exit(1);
});
