import { Router } from 'express';
import { createShareLink, getShareByToken } from '../services/shareService.js';
import { validateConfig } from '../services/validationService.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const shareRouter = Router();

shareRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body as {
      userId?: string;
      viewId?: string;
      overrides?: unknown;
      origin?: string;
    };

    if (!body.userId || !body.viewId) {
      throw new HttpError(400, 'userId and viewId are required');
    }

    if (body.overrides === undefined || body.overrides === null) {
      throw new HttpError(400, 'Request body must include an overrides object');
    }

    const overrides = validateConfig(body.overrides as Record<string, unknown>);
    const record = await createShareLink(body.userId, body.viewId, overrides);

    const origin =
      typeof body.origin === 'string' ? body.origin.replace(/\/$/, '') : '';
    const url = origin
      ? `${origin}/preview?token=${record.token}`
      : `/preview?token=${record.token}`;

    res.status(201).json({
      url,
      token: record.token,
      expiresAt: record.expiresAt.toISOString(),
    });
  }),
);

shareRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const token = param(req.params.token);
    const record = await getShareByToken(token);

    res.json({
      userId: record.userId,
      viewId: record.viewId,
      config: record.overrides,
    });
  }),
);
