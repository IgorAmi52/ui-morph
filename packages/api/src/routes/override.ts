import { Router } from 'express';
import { applyAiPrompt, applyOverride } from '../services/configService.js';
import { validateOverrideRequest } from '../services/validationService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const overrideRouter = Router();

overrideRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = validateOverrideRequest(req.body);

    if (payload.type === 'manual') {
      const config = await applyOverride(
        payload.userId,
        payload.viewId,
        payload.path,
        payload.changes!,
        payload.sessionId,
        payload.routeId,
      );
      res.json(config);
      return;
    }

    const config = await applyAiPrompt(
      payload.userId,
      payload.viewId,
      payload.path,
      payload.prompt!,
      payload.sessionId,
      payload.routeId,
    );
    res.json(config);
  }),
);
