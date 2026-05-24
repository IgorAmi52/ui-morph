import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AgentPageRequest,
  AgentPageResponse,
  GeneratedPageDefinition,
  GeneratedPageItem,
  GeneratedPageSection,
  LayoutNode,
} from '../types.js';
import { validateGeneratedPageDefinition } from './validationService.js';

const MAX_ITEMS_PER_SOURCE = 8;
const MAX_TEXT_LENGTH = 140;

function slug(input: string): string {
  const clean = input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return clean || Math.random().toString(36).slice(2, 8);
}

function compactText(input: string): string {
  const text = input.replace(/\s+/g, ' ').trim();
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…` : text;
}

function routeTitle(routeId: string, fallback: string): string {
  const label = routeId === 'index' ? fallback : routeId;
  return label
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || fallback;
}

function collectTextNodes(nodes: LayoutNode[], items: GeneratedPageItem[]): void {
  for (const node of nodes) {
    if (items.length >= MAX_ITEMS_PER_SOURCE) return;
    if (!node.hidden && node.text?.trim()) {
      const text = compactText(node.text);
      items.push({
        id: `item-${slug(node.path)}`,
        label: node.name ?? routeTitle(node.tag, 'Content'),
        text,
        value: text,
        kind: text.length <= 32 && /\d/.test(text) ? 'metric' : 'text',
      });
    }
    collectTextNodes(node.children, items);
  }
}

function firstVisualForRoute(request: AgentPageRequest, routeId?: string): string | undefined {
  if (!routeId) return undefined;
  return request.sources.find((source) => source.routeId === routeId)
    ?.visualFragments?.[0]?.html;
}

function attachMissingVisuals(
  request: AgentPageRequest,
  definition: GeneratedPageDefinition,
): GeneratedPageDefinition {
  return {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      visualHtml: section.visualHtml ?? firstVisualForRoute(request, section.sourceRouteId),
    })),
  };
}

function fallbackDefinition(request: AgentPageRequest): GeneratedPageDefinition {
  const titleBase = request.prompt.split(/[.!?]/)[0]?.trim() || 'Generated page';
  const sections: GeneratedPageSection[] = request.sources.map((source, index) => {
    const items: GeneratedPageItem[] = [];
    collectTextNodes(source.snapshot.nodes, items);
    if (items.length === 0) {
      items.push({
        id: `item-${index}-empty`,
        label: source.label,
        text: 'No readable content was captured from this page.',
        kind: 'text',
      });
    }
    return {
      id: `section-${slug(source.routeId)}-${index}`,
      title: source.label || routeTitle(source.routeId, 'Source page'),
      sourceRouteId: source.routeId,
      visualHtml: source.visualFragments?.[0]?.html,
      items,
    };
  });

  return {
    title: compactText(titleBase),
    description: compactText(request.prompt),
    sections,
  };
}

function getModelName(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
}

async function generateWithGemini(request: AgentPageRequest): Promise<GeneratedPageDefinition | null> {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: getModelName() });
  const prompt = [
    'Create a compact dashboard page definition as strict JSON only.',
    'Schema: { "title": string, "description"?: string, "sections": [{ "id": string, "title": string, "sourceRouteId"?: string, "visualHtml"?: string, "items": [{ "id": string, "label": string, "text"?: string, "value"?: string, "kind": "text" | "metric" | "list" }] }] }',
    'Use stable lowercase id strings. Keep labels short. Do not invent detailed business facts beyond the snapshots.',
    'If a source has visualFragments and the user asks for charts/images/visual blocks, copy the relevant visualFragments[].html exactly into section.visualHtml.',
    `User request: ${request.prompt}`,
    'Sources JSON:',
    JSON.stringify(request.sources.map((source) => ({
      viewId: source.viewId,
      routeId: source.routeId,
      label: source.label,
      visualFragments: source.visualFragments?.map((fragment) => ({
        id: fragment.id,
        label: fragment.label,
        text: fragment.text,
        html: fragment.html,
      })),
      snapshot: source.snapshot,
    }))),
  ].join('\n');

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?|```$/g, '').trim();
    return validateGeneratedPageDefinition(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function generatePageDefinition(request: AgentPageRequest): Promise<AgentPageResponse> {
  const generated = await generateWithGemini(request);
  const definition = attachMissingVisuals(request, generated ?? fallbackDefinition(request));
  return { definition: validateGeneratedPageDefinition(definition) };
}
