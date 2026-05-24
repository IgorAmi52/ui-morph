import type {
  AgentMessageRequest,
  AgentSuggestionsRequest,
  ElementOverride,
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
  'visibility',
  'overflow',
  'boxShadow',
]);

const DANGEROUS_STYLE_PATTERN =
  /url\s*\(|expression\s*\(|javascript\s*:|@import|behavior\s*:/i;

const SCRIPT_TAG_PATTERN = /<\s*script\b/i;

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
  path: string;
  type: 'manual' | 'ai_prompt';
  changes?: ElementOverride;
  prompt?: string;
} {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const { userId, viewId, path, type, changes, prompt } = body as Record<string, unknown>;

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
      userId,
      viewId,
      path,
      type,
      changes: validateOverride(changes as ElementOverride),
    };
  }

  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new ValidationError('prompt is required for ai_prompt overrides');
  }

  return { userId, viewId, path, type, prompt: prompt.trim() };
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
  return result;
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

  return {
    userId: b.userId.trim(),
    viewId: b.viewId.trim(),
    message: b.message.trim(),
    selectedPath: typeof b.selectedPath === 'string' ? b.selectedPath : undefined,
    selectionLabel:
      typeof b.selectionLabel === 'string' ? b.selectionLabel : undefined,
    selectionSubtree,
    snapshot,
    config,
    history,
  };
}
