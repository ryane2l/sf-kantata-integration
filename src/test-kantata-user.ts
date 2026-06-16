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
  const res = await kantataClient.get('/users', {
    params: { search: 'ryan', per_page: 10 },
  });

  const users = res.data.users ?? {};
  console.log('\n=== Matching Kantata Users ===\n');
  Object.values(users).forEach((user: any) => {
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.full_name}`);
    console.log(`  Email: ${user.email_address}`);
    console.log('');
  });
}

run().catch((err) => {
  console.error('Error:', err.response?.data ?? err.message);
  process.exit(1);
});
