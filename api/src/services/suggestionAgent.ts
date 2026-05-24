import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AgentSuggestionsRequest, LayoutNode } from '../types.js';
import { ValidationError } from './validationService.js';

const MAX_SUGGESTIONS = 3;
const MAX_SUGGESTION_LENGTH = 72;

function getSuggestionsModelName(): string {
  return (
    process.env.GEMINI_SUGGESTIONS_MODEL ??
    process.env.GEMINI_MODEL ??
    'gemini-2.0-flash-lite'
  );
}

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    throw new ValidationError('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

function sectionLabel(node: LayoutNode): string {
  return node.name ?? node.text ?? node.tag;
}

function buildPrompt(request: AgentSuggestionsRequest): string {
  const sections = request.snapshot.nodes.map((node) => ({
    segment: node.segment,
    tag: node.tag,
    label: sectionLabel(node),
    headings: node.children
      .filter((c) => /^h[1-3]$/.test(c.tag) && c.text)
      .map((c) => c.text)
      .slice(0, 2),
  }));

  const summary = {
    viewId: request.snapshot.viewId,
    selectedPath: request.selectedPath,
    rootPath: request.snapshot.rootPath ?? 'morph',
    sections,
  };

  return [
    'Suggest 3 short starter prompts for a layout assistant.',
    'Return ONLY a JSON array of 3 strings (max 72 chars each).',
    'Include: one page-structure question, one style tweak, one hide/reorder idea.',
    'Use real section labels from the layout summary. Do not invent elements.',
    request.selectedPath ? 'One prompt should reference the selected element.' : '',
    `Layout summary: ${JSON.stringify(summary)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function parseSuggestions(raw: string): string[] {
  const trimmed = raw.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) throw new ValidationError('Could not parse suggestion response');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) {
    throw new ValidationError('Suggestions must be a JSON array');
  }

  const suggestions = parsed
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0)
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => (s.length > MAX_SUGGESTION_LENGTH ? `${s.slice(0, MAX_SUGGESTION_LENGTH - 1)}…` : s));

  if (suggestions.length === 0) {
    throw new ValidationError('No valid suggestions returned');
  }

  return suggestions;
}

export async function generateLayoutSuggestions(
  request: AgentSuggestionsRequest,
): Promise<string[]> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: getSuggestionsModelName(),
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 256,
      temperature: 0.4,
    },
  });

  const result = await model.generateContent(buildPrompt(request));
  const text = result.response.text();
  if (!text?.trim()) {
    throw new ValidationError('Empty suggestion response from model');
  }

  return parseSuggestions(text);
}
