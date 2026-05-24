import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  validateAgentPageRequest,
  validateAgentMessageRequest,
  validateAgentSuggestionsRequest,
} from '../services/validationService.js';
import { runLayoutAgent } from '../services/layoutAgent.js';
import { generatePageDefinition } from '../services/pageAgentService.js';
import { generateLayoutSuggestions } from '../services/suggestionAgent.js';
import { streamLayoutAgent } from '../services/streamLayoutAgent.js';
import { formatSseEvent } from '../agent/agentEvents.js';

export const agentRouter = Router();

agentRouter.post(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const payload = validateAgentSuggestionsRequest(req.body);
    const suggestions = await generateLayoutSuggestions(payload);
    res.json({ suggestions });
  }),
);

agentRouter.post(
  '/page',
  asyncHandler(async (req, res) => {
    const payload = validateAgentPageRequest(req.body);
    const result = await generatePageDefinition(payload);
    res.json(result);
  }),
);

agentRouter.post(
  '/message',
  asyncHandler(async (req, res) => {
    const payload = validateAgentMessageRequest(req.body);
    const result = await runLayoutAgent(payload);
    res.json(result);
  }),
);

agentRouter.post(
  '/message/stream',
  asyncHandler(async (req, res) => {
    const payload = validateAgentMessageRequest(req.body);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    for await (const event of streamLayoutAgent(payload)) {
      res.write(formatSseEvent(event));
      if (event.type === 'done') break;
    }
    res.end();
  }),
);
