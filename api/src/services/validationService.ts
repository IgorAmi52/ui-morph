import type {
  AgentPageRequest,
  AgentMessageRequest,
  AgentSuggestionsRequest,
  ElementOverride,
  GeneratedPageDefinition,
  GeneratedPageItem,
  GeneratedPageSection,
  GeneratedPageSourceSnapshot,
  GeneratedPageSourceSummary,
  GeneratedPageVisualFragment,
  LayoutNode,
  LayoutSnapshot,
} from '../types.js';

const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'backgroundColor',
  'background',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontFamily',
  'textAlign',
  'textDecoration',
  'lineHeight',
  'letterSpacing',
  'opacity',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'border',
  'borderRadius',
  'borderColor',
  'borderWidth',
  'display',
  'flex',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'gap',
  'gridTemplateColumns',
  'gridTemplateRows',
  'gridColumn',
  'gridColumnStart',
  'gridColumnEnd',
  'gridRow',
  'gridRowStart',
  'gridRowEnd',
  'left',
  'top',
  'right',
  'bottom',
  'order',
  'visibility',
  'overflow',
  'boxShadow',
]);

const DANGEROUS_STYLE_PATTERN =
  /url\s*\(|expression\s*\(|javascript\s*:|@import|behavior\s*:/i;

const SCRIPT_TAG_PATTERN = /<\s*script\b/i;
const DANGEROUS_HTML_PATTERN =
  /<\s*(script|iframe|object|embed)\b|on[a-z]+\s*=|javascript\s*:/i;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function sanitizeText(value: string): string {
  if (SCRIPT_TAG_PATTERN.test(value)) {
    throw new ValidationError('Text contains disallowed script content');
  }
  return value.replace(/<\/?[^>]+>/g, '');
}

function sanitizeStyle(style: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [prop, rawValue] of Object.entries(style)) {
    if (!ALLOWED_STYLE_PROPS.has(prop)) {
      throw new ValidationError(`CSS property "${prop}" is not allowed`);
    }

    const value = String(rawValue).trim();
    if (!value) continue;

    if (DANGEROUS_STYLE_PATTERN.test(value)) {
      throw new ValidationError(`CSS value for "${prop}" contains disallowed content`);
    }

    sanitized[prop] = value;
  }

  return sanitized;
}

function sanitizeChildOrder(childOrder: string[]): string[] {
  if (!Array.isArray(childOrder) || childOrder.length === 0) {
    throw new ValidationError('childOrder must be a non-empty array');
  }

  return childOrder.map((entry) => {
    const path = String(entry).trim();
    if (!path) {
      throw new ValidationError('childOrder entries must be non-empty strings');
    }
    return path;
  });
}

export function validateOverride(override: ElementOverride): ElementOverride {
  const result: ElementOverride = {};

  if (override.hidden !== undefined) {
    if (typeof override.hidden !== 'boolean') {
      throw new ValidationError('hidden must be a boolean');
    }
    result.hidden = override.hidden;
  }

  if (override.text !== undefined) {
    if (typeof override.text !== 'string') {
      throw new ValidationError('text must be a string');
    }
    result.text = sanitizeText(override.text);
  }

  if (override.style !== undefined) {
    if (typeof override.style !== 'object' || override.style === null || Array.isArray(override.style)) {
      throw new ValidationError('style must be an object');
    }
    result.style = sanitizeStyle(override.style);
  }

  if (override.childOrder !== undefined) {
    result.childOrder = sanitizeChildOrder(override.childOrder);
  }

  return result;
}

export function validateConfig(config: Record<string, unknown>): Record<string, ElementOverride> {
  const validated: Record<string, ElementOverride> = {};

  for (const [path, override] of Object.entries(config)) {
    if (!path.trim()) {
      throw new ValidationError('Override paths must be non-empty');
    }
    if (typeof override !== 'object' || override === null || Array.isArray(override)) {
      throw new ValidationError(`Override for "${path}" must be an object`);
    }
    validated[path] = validateOverride(override as ElementOverride);
  }

  return validated;
}

export function validateOverrideRequest(body: unknown): {
  userId: string;
  viewId: string;
  sessionId?: string;
  routeId?: string;
  path: string;
  type: 'manual' | 'ai_prompt';
  changes?: ElementOverride;
  prompt?: string;
} {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const { userId, viewId, sessionId, routeId, path, type, changes, prompt } = body as Record<string, unknown>;

  if (typeof userId !== 'string' || !userId.trim()) {
    throw new ValidationError('userId is required');
  }
  if (typeof viewId !== 'string' || !viewId.trim()) {
    throw new ValidationError('viewId is required');
  }
  if (typeof path !== 'string' || !path.trim()) {
    throw new ValidationError('path is required');
  }
  if (type !== 'manual' && type !== 'ai_prompt') {
    throw new ValidationError('type must be "manual" or "ai_prompt"');
  }

  if (type === 'manual') {
    if (changes === undefined) {
      throw new ValidationError('changes is required for manual overrides');
    }
    if (typeof changes !== 'object' || changes === null || Array.isArray(changes)) {
      throw new ValidationError('changes must be an object');
    }
    return {
      userId: userId.trim(),
      viewId: viewId.trim(),
      sessionId: typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : undefined,
      routeId: typeof routeId === 'string' && routeId.trim() ? routeId.trim() : undefined,
      path: path.trim(),
      type,
      changes: validateOverride(changes as ElementOverride),
    };
  }

  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new ValidationError('prompt is required for ai_prompt overrides');
  }

  return {
    userId: userId.trim(),
    viewId: viewId.trim(),
    sessionId: typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : undefined,
    routeId: typeof routeId === 'string' && routeId.trim() ? routeId.trim() : undefined,
    path: path.trim(),
    type,
    prompt: prompt.trim(),
  };
}

function validateLayoutNode(node: unknown, label: string): LayoutNode {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    throw new ValidationError(`${label} must be an object`);
  }
  const n = node as Record<string, unknown>;
  if (typeof n.path !== 'string' || !n.path.trim()) {
    throw new ValidationError(`${label}.path is required`);
  }
  if (typeof n.tag !== 'string') {
    throw new ValidationError(`${label}.tag is required`);
  }
  if (typeof n.segment !== 'string') {
    throw new ValidationError(`${label}.segment is required`);
  }
  if (typeof n.textLeaf !== 'boolean') {
    throw new ValidationError(`${label}.textLeaf is required`);
  }
  if (typeof n.hidden !== 'boolean') {
    throw new ValidationError(`${label}.hidden is required`);
  }
  if (!Array.isArray(n.children)) {
    throw new ValidationError(`${label}.children must be an array`);
  }
  const children = n.children.map((c, i) => validateLayoutNode(c, `${label}.children[${i}]`));
  const result: LayoutNode = {
    path: n.path,
    tag: n.tag,
    segment: n.segment,
    textLeaf: n.textLeaf,
    hidden: n.hidden,
    children,
  };
  if (n.role !== undefined) result.role = String(n.role);
  if (n.name !== undefined) result.name = String(n.name);
  if (n.text !== undefined) result.text = String(n.text);
  if (n.override !== undefined) {
    result.override = validateOverride(n.override as ElementOverride);
  }
  if (n.computed !== undefined && typeof n.computed === 'object' && n.computed !== null && !Array.isArray(n.computed)) {
    const computed = n.computed as Record<string, unknown>;
    result.computed = {};
    if (computed.color !== undefined) result.computed.color = String(computed.color);
    if (computed.fontSize !== undefined) result.computed.fontSize = String(computed.fontSize);
    if (computed.backgroundColor !== undefined) result.computed.backgroundColor = String(computed.backgroundColor);
  }
  if (n.layout !== undefined && typeof n.layout === 'object' && n.layout !== null && !Array.isArray(n.layout)) {
    const layout = n.layout as Record<string, unknown>;
    if (typeof layout.display === 'string' && typeof layout.isGridItem === 'boolean') {
      result.layout = {
        display: layout.display,
        isGridItem: layout.isGridItem,
      };
      if (typeof layout.gridColumn === 'string') result.layout.gridColumn = layout.gridColumn;
      if (typeof layout.gridRow === 'string') result.layout.gridRow = layout.gridRow;
      if (typeof layout.columnSpan === 'number') result.layout.columnSpan = layout.columnSpan;
      if (typeof layout.maxColumnSpan === 'number') result.layout.maxColumnSpan = layout.maxColumnSpan;
    }
  }
  if (n.bounds !== undefined && typeof n.bounds === 'object' && n.bounds !== null && !Array.isArray(n.bounds)) {
    const bounds = n.bounds as Record<string, unknown>;
    if (typeof bounds.width === 'number' && typeof bounds.height === 'number') {
      result.bounds = {
        width: bounds.width,
        height: bounds.height,
      };
    }
  }
  if (n.capabilities !== undefined && typeof n.capabilities === 'object' && n.capabilities !== null && !Array.isArray(n.capabilities)) {
    const capabilities = n.capabilities as Record<string, unknown>;
    result.capabilities = {
      visibility: capabilities.visibility === true,
      text: capabilities.text === true,
      style: capabilities.style === true,
      resize: capabilities.resize === true,
      reorder: capabilities.reorder === true,
    };
  }
  return result;
}

function validateStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${label} must be an array`);
  }
  return value.map((entry, i) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new ValidationError(`${label}[${i}] must be a non-empty string`);
    }
    return entry.trim();
  });
}

function validateAgentEditScope(scope: unknown): AgentMessageRequest['editScope'] {
  if (typeof scope !== 'object' || scope === null || Array.isArray(scope)) {
    throw new ValidationError('editScope must be an object');
  }
  const s = scope as Record<string, unknown>;
  if (s.mode !== 'selected-subtree' && s.mode !== 'page') {
    throw new ValidationError('editScope.mode must be selected-subtree or page');
  }
  if (typeof s.rootPath !== 'string' || !s.rootPath.trim()) {
    throw new ValidationError('editScope.rootPath is required');
  }
  return {
    rootPath: s.rootPath.trim(),
    allowedPaths: validateStringArray(s.allowedPaths, 'editScope.allowedPaths'),
    allowedParentPaths: validateStringArray(s.allowedParentPaths, 'editScope.allowedParentPaths'),
    mode: s.mode,
  };
}

function validateLayoutSnapshot(snapshot: unknown): LayoutSnapshot {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) {
    throw new ValidationError('snapshot must be an object');
  }
  const s = snapshot as Record<string, unknown>;
  if (typeof s.viewId !== 'string' || !s.viewId.trim()) {
    throw new ValidationError('snapshot.viewId is required');
  }
  if (typeof s.nodeCount !== 'number') {
    throw new ValidationError('snapshot.nodeCount is required');
  }
  if (!Array.isArray(s.nodes)) {
    throw new ValidationError('snapshot.nodes must be an array');
  }
  return {
    viewId: s.viewId,
    rootPath: typeof s.rootPath === 'string' && s.rootPath.trim() ? s.rootPath.trim() : 'morph',
    selectedPath: typeof s.selectedPath === 'string' ? s.selectedPath : undefined,
    truncated: typeof s.truncated === 'boolean' ? s.truncated : undefined,
    nodeCount: s.nodeCount,
    nodes: s.nodes.map((n, i) => validateLayoutNode(n, `snapshot.nodes[${i}]`)),
  };
}

function requiredStringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${key} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validateGeneratedPageItem(raw: unknown, label: string): GeneratedPageItem {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`${label} must be an object`);
  }
  const item = raw as Record<string, unknown>;
  const kind = item.kind;
  if (kind !== 'text' && kind !== 'metric' && kind !== 'list') {
    throw new ValidationError(`${label}.kind must be text, metric, or list`);
  }
  return {
    id: requiredStringField(item, 'id'),
    label: sanitizeText(requiredStringField(item, 'label')),
    text: item.text !== undefined ? sanitizeText(String(item.text)) : undefined,
    value: item.value !== undefined ? sanitizeText(String(item.value)) : undefined,
    kind,
  };
}

function validateGeneratedPageSection(raw: unknown, label: string): GeneratedPageSection {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`${label} must be an object`);
  }
  const section = raw as Record<string, unknown>;
  if (!Array.isArray(section.items)) {
    throw new ValidationError(`${label}.items must be an array`);
  }
  return {
    id: requiredStringField(section, 'id'),
    title: sanitizeText(requiredStringField(section, 'title')),
    sourceRouteId: optionalString(section.sourceRouteId),
    visualHtml: section.visualHtml !== undefined
      ? sanitizeHtml(String(section.visualHtml), `${label}.visualHtml`)
      : undefined,
    items: section.items.map((item, i) => validateGeneratedPageItem(item, `${label}.items[${i}]`)),
  };
}

function sanitizeHtml(value: string, label: string): string {
  const html = value.trim();
  if (!html) return '';
  if (html.length > 30000) {
    throw new ValidationError(`${label} is too large`);
  }
  if (DANGEROUS_HTML_PATTERN.test(html)) {
    throw new ValidationError(`${label} contains disallowed HTML`);
  }
  return html;
}

function validateGeneratedPageVisualFragment(raw: unknown, label: string): GeneratedPageVisualFragment {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`${label} must be an object`);
  }
  const fragment = raw as Record<string, unknown>;
  return {
    id: requiredStringField(fragment, 'id'),
    label: sanitizeText(requiredStringField(fragment, 'label')),
    routeId: requiredStringField(fragment, 'routeId'),
    path: requiredStringField(fragment, 'path'),
    html: sanitizeHtml(requiredStringField(fragment, 'html'), `${label}.html`),
    text: fragment.text !== undefined ? sanitizeText(String(fragment.text)) : undefined,
  };
}

export function validateGeneratedPageDefinition(raw: unknown): GeneratedPageDefinition {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError('definition must be an object');
  }
  const definition = raw as Record<string, unknown>;
  if (!Array.isArray(definition.sections)) {
    throw new ValidationError('definition.sections must be an array');
  }
  const sections = definition.sections.map((section, i) =>
    validateGeneratedPageSection(section, `definition.sections[${i}]`),
  );
  if (sections.length === 0) {
    throw new ValidationError('definition.sections must include at least one section');
  }
  return {
    title: sanitizeText(requiredStringField(definition, 'title')),
    description: definition.description !== undefined
      ? sanitizeText(String(definition.description))
      : undefined,
    sections,
  };
}

function validateGeneratedPageSourceSummary(raw: unknown, label: string): GeneratedPageSourceSummary {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`${label} must be an object`);
  }
  const source = raw as Record<string, unknown>;
  return {
    viewId: requiredStringField(source, 'viewId'),
    routeId: requiredStringField(source, 'routeId'),
    path: requiredStringField(source, 'path'),
    label: sanitizeText(requiredStringField(source, 'label')),
    capturedAt: requiredStringField(source, 'capturedAt'),
  };
}

function validateGeneratedPageSourceSnapshot(raw: unknown, label: string): GeneratedPageSourceSnapshot {
  const summary = validateGeneratedPageSourceSummary(raw, label);
  const source = raw as Record<string, unknown>;
  let visualFragments: GeneratedPageVisualFragment[] | undefined;
  if (source.visualFragments !== undefined) {
    if (!Array.isArray(source.visualFragments)) {
      throw new ValidationError(`${label}.visualFragments must be an array`);
    }
    visualFragments = source.visualFragments
      .slice(0, 8)
      .map((fragment, i) =>
        validateGeneratedPageVisualFragment(fragment, `${label}.visualFragments[${i}]`),
      );
  }
  return {
    ...summary,
    snapshot: validateLayoutSnapshot(source.snapshot),
    visualFragments,
  };
}

export function validateAgentPageRequest(body: unknown): AgentPageRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Request body must be an object');
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.sources) || b.sources.length === 0) {
    throw new ValidationError('sources must include at least one page snapshot');
  }
  return {
    userId: requiredStringField(b, 'userId'),
    viewId: requiredStringField(b, 'viewId'),
    sessionId: optionalString(b.sessionId) ?? 'default',
    routeId: optionalString(b.routeId) ?? requiredStringField(b, 'viewId'),
    prompt: sanitizeText(requiredStringField(b, 'prompt')),
    sources: b.sources.map((source, i) =>
      validateGeneratedPageSourceSnapshot(source, `sources[${i}]`),
    ),
  };
}

export function validateGeneratedPageSources(raw: unknown): GeneratedPageSourceSummary[] {
  if (!Array.isArray(raw)) {
    throw new ValidationError('sources must be an array');
  }
  return raw.map((source, i) => validateGeneratedPageSourceSummary(source, `sources[${i}]`));
}

export function validateAgentSuggestionsRequest(body: unknown): AgentSuggestionsRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const b = body as Record<string, unknown>;
  if (typeof b.userId !== 'string' || !b.userId.trim()) {
    throw new ValidationError('userId is required');
  }
  if (typeof b.viewId !== 'string' || !b.viewId.trim()) {
    throw new ValidationError('viewId is required');
  }
  if (typeof b.config !== 'object' || b.config === null || Array.isArray(b.config)) {
    throw new ValidationError('config must be an object');
  }

  return {
    userId: b.userId.trim(),
    viewId: b.viewId.trim(),
    selectedPath: typeof b.selectedPath === 'string' ? b.selectedPath : undefined,
    snapshot: validateLayoutSnapshot(b.snapshot),
    config: validateConfig(b.config as Record<string, unknown>),
  };
}

export function validateAgentMessageRequest(body: unknown): AgentMessageRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const b = body as Record<string, unknown>;
  if (typeof b.userId !== 'string' || !b.userId.trim()) {
    throw new ValidationError('userId is required');
  }
  if (typeof b.viewId !== 'string' || !b.viewId.trim()) {
    throw new ValidationError('viewId is required');
  }
  if (typeof b.message !== 'string' || !b.message.trim()) {
    throw new ValidationError('message is required');
  }
  if (typeof b.config !== 'object' || b.config === null || Array.isArray(b.config)) {
    throw new ValidationError('config must be an object');
  }

  const snapshot = validateLayoutSnapshot(b.snapshot);
  const config = validateConfig(b.config as Record<string, unknown>);

  let history: AgentMessageRequest['history'];
  if (b.history !== undefined) {
    if (!Array.isArray(b.history)) {
      throw new ValidationError('history must be an array');
    }
    history = b.history.map((entry, i) => {
      if (typeof entry !== 'object' || entry === null) {
        throw new ValidationError(`history[${i}] must be an object`);
      }
      const e = entry as Record<string, unknown>;
      if (e.role !== 'user' && e.role !== 'assistant') {
        throw new ValidationError(`history[${i}].role must be user or assistant`);
      }
      if (typeof e.content !== 'string') {
        throw new ValidationError(`history[${i}].content must be a string`);
      }
      return { role: e.role, content: e.content };
    });
  }

  let selectionSubtree: AgentMessageRequest['selectionSubtree'];
  if (b.selectionSubtree !== undefined) {
    selectionSubtree = validateLayoutNode(b.selectionSubtree, 'selectionSubtree');
  }

  let editScope: AgentMessageRequest['editScope'];
  if (b.editScope !== undefined) {
    editScope = validateAgentEditScope(b.editScope);
  }

  return {
    userId: b.userId.trim(),
    viewId: b.viewId.trim(),
    message: b.message.trim(),
    selectedPath: typeof b.selectedPath === 'string' ? b.selectedPath : undefined,
    selectionLabel:
      typeof b.selectionLabel === 'string' ? b.selectionLabel : undefined,
    selectionSubtree,
    editScope,
    snapshot,
    config,
    history,
    instructionsOverride:
      typeof b.instructionsOverride === 'string' ? b.instructionsOverride : undefined,
  };
}
