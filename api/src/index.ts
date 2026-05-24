import 'dotenv/config';
import { createApp } from './app.js';
import { closePool, runMigrations } from './db/client.js';

const port = Number(process.env.PORT ?? 3001);

async function start(): Promise<void> {
  await runMigrations();

  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`@ui-morph/api listening on http://localhost:${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
