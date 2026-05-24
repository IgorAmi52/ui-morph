import { Router } from 'express';
import { getConfig, saveConfig } from '../services/configService.js';
import { validateConfig } from '../services/validationService.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const configRouter = Router();

configRouter.get(
  '/:userId/:viewId',
  asyncHandler(async (req, res) => {
    const userId = param(req.params.userId);
    const viewId = param(req.params.viewId);
    const config = await getConfig(userId, viewId);
    res.json(config);
  }),
);

configRouter.put(
  '/:userId/:viewId',
  asyncHandler(async (req, res) => {
    const userId = param(req.params.userId);
    const viewId = param(req.params.viewId);
    const body = req.body as { overrides?: unknown };

    if (body === null || typeof body !== 'object' || body.overrides === undefined) {
      throw new HttpError(400, 'Request body must include an overrides object');
    }

    const overrides = validateConfig(body.overrides as Record<string, unknown>);
    const saved = await saveConfig(userId, viewId, overrides);
    res.json(saved);
  }),
);
