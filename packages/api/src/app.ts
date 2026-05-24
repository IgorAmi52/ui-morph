import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';
import { agentRouter } from './routes/agent.js';
import { configRouter } from './routes/config.js';
import { overrideRouter } from './routes/override.js';
import { pagesRouter } from './routes/pages.js';
import { sharesRouter } from './routes/shares.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/config', configRouter);
  app.use('/chat', chatRouter);
  app.use('/override', overrideRouter);
  app.use('/agent', agentRouter);
  app.use('/pages', pagesRouter);
  app.use('/shares', sharesRouter);

  app.use(errorHandler);

  return app;
}
