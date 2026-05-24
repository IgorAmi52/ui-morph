import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getChatHistory,
  saveChatHistory,
  validateStoredMessages,
} from '../services/chatHistoryService.js';
import { ValidationError } from '../services/validationService.js';
import { resolveRouteId, resolveSessionId } from './sessionScope.js';

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const chatRouter = Router();

chatRouter.get(
  '/:userId/:viewId',
  asyncHandler(async (req, res) => {
    const userId = param(req.params.userId);
    const viewId = param(req.params.viewId);
    const messages = await getChatHistory(
      userId,
      viewId,
      resolveSessionId(req),
      resolveRouteId(req, viewId),
    );
    res.json({ messages });
  }),
);

chatRouter.put(
  '/:userId/:viewId',
  asyncHandler(async (req, res) => {
    const userId = param(req.params.userId);
    const viewId = param(req.params.viewId);
    const sessionId = resolveSessionId(req);
    const routeId = resolveRouteId(req, viewId);
    const body = req.body as { messages?: unknown };

    if (body === null || typeof body !== 'object' || body.messages === undefined) {
      throw new ValidationError('Request body must include a messages array');
    }

    const messages = await saveChatHistory(
      userId,
      viewId,
      validateStoredMessages(body.messages),
      sessionId,
      routeId,
    );
    res.json({ messages });
  }),
);
