import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import {
  createPage,
  getPage,
  getPageConfig,
  savePageConfig,
  validateCreatePageBody,
  validateSavePageBody,
} from '../services/pageService.js';

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const pagesRouter = Router();

pagesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const page = await createPage(validateCreatePageBody(req.body));
    res.status(201).json(page);
  }),
);

pagesRouter.get(
  '/:pageId',
  asyncHandler(async (req, res) => {
    const page = await getPage(param(req.params.pageId));
    if (!page) throw new HttpError(404, 'Page not found');
    res.json(page);
  }),
);

pagesRouter.get(
  '/:pageId/config',
  asyncHandler(async (req, res) => {
    const config = await getPageConfig(param(req.params.pageId));
    if (!config) throw new HttpError(404, 'Page not found');
    res.json(config);
  }),
);

pagesRouter.put(
  '/:pageId/config',
  asyncHandler(async (req, res) => {
    const config = await savePageConfig(
      param(req.params.pageId),
      validateSavePageBody(req.body),
    );
    if (!config) throw new HttpError(404, 'Page not found');
    res.json(config);
  }),
);
