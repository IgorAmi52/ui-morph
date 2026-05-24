import type { AgentEditScope, ElementOverride, LayoutNode, LayoutSnapshot, MorphConfig } from '../types.js';
import { ValidationError, validateOverride } from '../services/validationService.js';
import { childSegments, indexSnapshot, isRootPath, rootChildSegments } from './snapshotIndex.js';

export function mergeOverride(
  config: MorphConfig,
  path: string,
  changes: ElementOverride,
): MorphConfig {
  const existing = config[path] ?? {};
  const merged: ElementOverride = { ...existing, ...changes };
  if (changes.style) {
    merged.style = { ...existing.style, ...changes.style };
  }
  const validated = validateOverride(merged);
  return { ...config, [path]: validated };
}

export function assertPathInSnapshot(snapshot: LayoutSnapshot, path: string): void {
  const { paths } = indexSnapshot(snapshot);
  if (!paths.has(path)) {
    throw new ValidationError(`Path "${path}" is not in the layout snapshot`);
  }
}

function walkNode(node: LayoutNode, visit: (node: LayoutNode) => void): void {
  visit(node);
  for (const child of node.children) walkNode(child, visit);
}

export function deriveEditScope(snapshot: LayoutSnapshot, selectionSubtree?: LayoutNode): AgentEditScope {
  if (selectionSubtree) {
    const allowedPaths: string[] = [];
    const allowedParentPaths: string[] = [];
    walkNode(selectionSubtree, (node) => {
      allowedPaths.push(node.path);
      if (node.children.length > 0) allowedParentPaths.push(node.path);
    });
    return {
      rootPath: snapshot.rootPath ?? 'morph',
      allowedPaths,
      allowedParentPaths,
      mode: 'selected-subtree',
    };
  }

  const allowedPaths: string[] = [];
  const allowedParentPaths = [snapshot.rootPath ?? 'morph'];
  for (const node of snapshot.nodes) {
    walkNode(node, (current) => {
      allowedPaths.push(current.path);
      if (current.children.length > 0) allowedParentPaths.push(current.path);
    });
  }

  return {
    rootPath: snapshot.rootPath ?? 'morph',
    allowedPaths,
    allowedParentPaths,
    mode: 'page',
  };
}

function assertPathInScope(scope: AgentEditScope | undefined, path: string): void {
  if (!scope) return;
  if (!scope.allowedPaths.includes(path)) {
    throw new ValidationError(`Path "${path}" is outside the current edit scope`);
  }
}

function assertParentPathInScope(scope: AgentEditScope | undefined, parentPath: string): void {
  if (!scope) return;
  if (!scope.allowedParentPaths.includes(parentPath)) {
    throw new ValidationError(`Parent path "${parentPath}" is outside the current edit scope`);
  }
}

export function executeSetElementOverride(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { path: string; hidden?: boolean; text?: string; style?: Record<string, string> },
  scope?: AgentEditScope,
): MorphConfig {
  assertPathInSnapshot(snapshot, args.path);
  assertPathInScope(scope, args.path);

  const node = indexSnapshot(snapshot).nodesByPath.get(args.path)!;
  if (args.text !== undefined && !node.textLeaf) {
    throw new ValidationError(`Path "${args.path}" is not a text leaf; cannot set text`);
  }

  const changes: ElementOverride = {};
  if (args.hidden !== undefined) changes.hidden = args.hidden;
  if (args.text !== undefined) changes.text = args.text;
  if (args.style !== undefined) changes.style = args.style;

  return mergeOverride(config, args.path, changes);
}

export function executeRemoveElementOverride(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { path: string },
  scope?: AgentEditScope,
): MorphConfig {
  assertPathInSnapshot(snapshot, args.path);
  assertPathInScope(scope, args.path);
  const { [args.path]: _, ...rest } = config;
  return rest;
}

export function executeReorderChildren(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { parentPath: string; childOrder: string[] },
  scope?: AgentEditScope,
): MorphConfig {
  assertParentPathInScope(scope, args.parentPath);

  if (isRootPath(snapshot, args.parentPath)) {
    const validSegments = new Set(rootChildSegments(snapshot));
    for (const seg of args.childOrder) {
      if (!validSegments.has(seg)) {
        throw new ValidationError(
          `Segment "${seg}" is not a top-level section on this page`,
        );
      }
    }
    const validated = validateOverride({ childOrder: args.childOrder });
    return mergeOverride(config, args.parentPath, { childOrder: validated.childOrder });
  }

  assertPathInSnapshot(snapshot, args.parentPath);

  const parent = indexSnapshot(snapshot).nodesByPath.get(args.parentPath)!;
  const validSegments = new Set(childSegments(parent));

  for (const seg of args.childOrder) {
    if (!validSegments.has(seg)) {
      throw new ValidationError(
        `Segment "${seg}" is not a direct child of "${args.parentPath}"`,
      );
    }
  }

  const validated = validateOverride({ childOrder: args.childOrder });
  return mergeOverride(config, args.parentPath, { childOrder: validated.childOrder });
}

export function executeApplyScopedOverrides(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { changes: Array<{ path: string; hidden?: boolean; text?: string; style?: Record<string, string> }> },
  scope?: AgentEditScope,
): MorphConfig {
  if (!Array.isArray(args.changes) || args.changes.length === 0) {
    throw new ValidationError('changes must be a non-empty array');
  }
  return args.changes.reduce(
    (next, change) => executeSetElementOverride(next, snapshot, change, scope),
    config,
  );
}

export function executeResizeGridItem(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { path: string; columnSpan: number },
  scope?: AgentEditScope,
): MorphConfig {
  assertPathInSnapshot(snapshot, args.path);
  assertPathInScope(scope, args.path);

  const node = indexSnapshot(snapshot).nodesByPath.get(args.path)!;
  if (!node.layout?.isGridItem || !node.layout.maxColumnSpan) {
    throw new ValidationError(`Path "${args.path}" is not a resizable grid item`);
  }
  if (!Number.isInteger(args.columnSpan) || args.columnSpan < 1 || args.columnSpan > node.layout.maxColumnSpan) {
    throw new ValidationError(`columnSpan must be between 1 and ${node.layout.maxColumnSpan}`);
  }

  return mergeOverride(config, args.path, {
    style: { gridColumn: `span ${args.columnSpan}` },
  });
}

function validatePixelSize(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 4000) {
    throw new ValidationError(`${label} must be a number from 1 to 4000`);
  }
  return `${Math.round(value)}px`;
}

export function executeResizeBox(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { path: string; width?: number; height?: number },
  scope?: AgentEditScope,
): MorphConfig {
  assertPathInSnapshot(snapshot, args.path);
  assertPathInScope(scope, args.path);

  const node = indexSnapshot(snapshot).nodesByPath.get(args.path)!;
  if (node.capabilities && !node.capabilities.resize) {
    throw new ValidationError(`Path "${args.path}" is not resizable`);
  }

  const width = validatePixelSize(args.width, 'width');
  const height = validatePixelSize(args.height, 'height');
  if (!width && !height) {
    throw new ValidationError('width or height is required');
  }

  return mergeOverride(config, args.path, {
    style: {
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    },
  });
}

export function executeSetText(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { path: string; text: string },
  scope?: AgentEditScope,
): MorphConfig {
  return executeSetElementOverride(config, snapshot, args, scope);
}

export function executeSetStyle(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { path: string; style: Record<string, string> },
  scope?: AgentEditScope,
): MorphConfig {
  return executeSetElementOverride(config, snapshot, args, scope);
}
