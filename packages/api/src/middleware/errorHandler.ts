import type { NextFunction, Request, Response } from 'express';
import { GoogleGenerativeAIFetchError } from '@google/generative-ai';
import { ValidationError } from '../services/validationService.js';

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof GoogleGenerativeAIFetchError) {
    const status = err.status ?? 502;
    let message = err.message;
    if (status === 429) {
      message =
        'Gemini API rate limit or quota exceeded. Try again later, switch GEMINI_MODEL ' +
        '(e.g. gemini-2.5-flash), or enable billing in Google AI Studio.';
    } else if (status === 401 || status === 403) {
      message = 'Gemini API rejected the API key. Check GEMINI_API_KEY in packages/api/.env.';
    }
    res.status(status >= 400 && status < 600 ? status : 502).json({ error: message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
