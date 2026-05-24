import type { ElementOverride, LayoutSnapshot, MorphConfig } from '../types.js';
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

export function executeSetElementOverride(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { path: string; hidden?: boolean; text?: string; style?: Record<string, string> },
): MorphConfig {
  assertPathInSnapshot(snapshot, args.path);

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
): MorphConfig {
  assertPathInSnapshot(snapshot, args.path);
  const { [args.path]: _, ...rest } = config;
  return rest;
}

export function executeReorderChildren(
  config: MorphConfig,
  snapshot: LayoutSnapshot,
  args: { parentPath: string; childOrder: string[] },
): MorphConfig {
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
