import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AgentPageRequest,
  AgentPageResponse,
  GeneratedPageDefinition,
  GeneratedPageItem,
  GeneratedPageSection,
  GeneratedPageVisualFragment,
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

function isTableRequest(prompt: string): boolean {
  return /\b(table|grid|rows?|columns?|list)\b/i.test(prompt);
}

function isVisualRequest(prompt: string): boolean {
  return /\b(copy|exact|same|chart|graph|image|visual|block|card|panel|table|grid)\b/i.test(prompt);
}

function allFragments(request: AgentPageRequest): GeneratedPageVisualFragment[] {
  return request.sources.flatMap((source) => source.visualFragments ?? []);
}

function tokens(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !['the', 'and', 'for', 'with'].includes(token)),
  );
}

function fragmentMatchScore(section: GeneratedPageSection, fragment: GeneratedPageVisualFragment): number {
  const query = tokens([
    section.title,
    ...section.items.map((item) => `${item.label} ${item.text ?? ''} ${item.value ?? ''}`),
  ].join(' '));
  if (query.size === 0) return 0;

  const haystack = tokens(`${fragment.label} ${fragment.text ?? ''}`);
  let score = 0;
  for (const token of query) {
    if (haystack.has(token)) score++;
  }
  return score;
}

function findFragmentById(
  request: AgentPageRequest,
  fragmentId?: string,
): GeneratedPageVisualFragment | undefined {
  if (!fragmentId) return undefined;
  return allFragments(request).find((fragment) => fragment.id === fragmentId);
}

function firstFragmentForSection(
  request: AgentPageRequest,
  section: GeneratedPageSection,
): GeneratedPageVisualFragment | undefined {
  const source = section.sourceRouteId
    ? request.sources.find((item) => item.routeId === section.sourceRouteId)
    : request.sources.length === 1
      ? request.sources[0]
      : undefined;
  const fragments = source?.visualFragments ?? allFragments(request);
  if (fragments.length === 0) return undefined;

  const matched = fragments
    .map((fragment) => ({ fragment, score: fragmentMatchScore(section, fragment) }))
    .sort((a, b) => b.score - a.score)[0];
  if (matched && matched.score > 0) return matched.fragment;

  const sectionText = `${section.title} ${section.items.map((item) => item.label).join(' ')}`;
  if (isTableRequest(sectionText)) {
    return fragments.find((fragment) => fragment.kind === 'table') ?? fragments[0];
  }
  if (isTableRequest(request.prompt) && !/\b(chart|graph|donut|pie)\b/i.test(sectionText)) {
    return fragments.find((fragment) => fragment.kind === 'table') ?? fragments[0];
  }
  return fragments[0];
}

function attachMissingVisuals(
  request: AgentPageRequest,
  definition: GeneratedPageDefinition,
): GeneratedPageDefinition {
  const shouldAttachFallback = isVisualRequest(request.prompt);
  return {
    ...definition,
    sections: definition.sections.map((section) => {
      const selected = findFragmentById(request, section.sourceFragmentId);
      const fallback = !selected && shouldAttachFallback
        ? firstFragmentForSection(request, section)
        : undefined;
      const fragment = selected ?? fallback;
      return {
        ...section,
        sourceFragmentId: fragment?.id ?? section.sourceFragmentId,
        visualHtml: fragment?.html ?? section.visualHtml,
      };
    }),
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
      sourceFragmentId: source.visualFragments?.[0]?.id,
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
    'Schema: { "title": string, "description"?: string, "sections": [{ "id": string, "title": string, "sourceRouteId"?: string, "sourceFragmentId"?: string, "visualHtml"?: string, "items": [{ "id": string, "label": string, "text"?: string, "value"?: string, "kind": "text" | "metric" | "list" }] }] }',
    'Use stable lowercase id strings. Keep labels short. Do not invent detailed business facts beyond the snapshots.',
    'If the user asks for an exact table, chart, card, panel, or copied block, set section.sourceFragmentId to the best visualFragments[].id. Do not rewrite tables as loose values.',
    'Do not copy raw fragment HTML into visualHtml unless no matching sourceFragmentId exists.',
    `User request: ${request.prompt}`,
    'Sources JSON:',
    JSON.stringify(request.sources.map((source) => ({
      viewId: source.viewId,
      routeId: source.routeId,
      label: source.label,
      visualFragments: source.visualFragments?.map((fragment) => ({
        id: fragment.id,
        label: fragment.label,
        kind: fragment.kind,
        text: fragment.text,
        htmlLength: fragment.html.length,
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
