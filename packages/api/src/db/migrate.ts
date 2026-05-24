import 'dotenv/config';
import { runMigrations, closePool } from './client.js';

async function main(): Promise<void> {
  await runMigrations();
  console.log('Migration complete.');
  await closePool();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
