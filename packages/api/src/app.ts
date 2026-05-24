import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';
import { agentRouter } from './routes/agent.js';
import { configRouter } from './routes/config.js';
import { overrideRouter } from './routes/override.js';
import { shareRouter } from './routes/share.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/config', configRouter);
  app.use('/chat', chatRouter);
  app.use('/override', overrideRouter);
  app.use('/agent', agentRouter);
  app.use('/share', shareRouter);

  app.use(errorHandler);

  return app;
}
