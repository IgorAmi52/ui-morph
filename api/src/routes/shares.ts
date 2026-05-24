import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import {
  createShare,
  getShareConfig,
  getShareMetadata,
  saveShareConfig,
  validateCreateShareBody,
  validateSaveShareBody,
} from '../services/shareService.js';
import { resolveSessionId } from './sessionScope.js';

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const sharesRouter = Router();

sharesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = validateCreateShareBody(req.body);
    const actorSessionId = resolveSessionId(req) === 'default'
      ? payload.sessionId
      : resolveSessionId(req);
    const metadata = await createShare(payload, actorSessionId);
    res.status(201).json(metadata);
  }),
);

sharesRouter.get(
  '/:shareId',
  asyncHandler(async (req, res) => {
    const metadata = await getShareMetadata(param(req.params.shareId));
    if (!metadata) throw new HttpError(404, 'Share not found');
    res.json(metadata);
  }),
);

sharesRouter.get(
  '/:shareId/config',
  asyncHandler(async (req, res) => {
    const config = await getShareConfig(param(req.params.shareId));
    if (!config) throw new HttpError(404, 'Share not found');
    res.json(config);
  }),
);

sharesRouter.put(
  '/:shareId/config',
  asyncHandler(async (req, res) => {
    const result = await saveShareConfig(
      param(req.params.shareId),
      validateSaveShareBody(req.body),
      resolveSessionId(req),
    );
    if (!result) throw new HttpError(404, 'Share not found');
    res.json(result.config);
  }),
);
