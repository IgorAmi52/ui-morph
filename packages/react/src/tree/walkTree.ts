import {
  Children,
  isValidElement,
  cloneElement,
  Fragment,
  type ReactNode,
  type ReactElement,
} from 'react';
import type { MorphConfig, MorphMode } from '../types';
import { buildSegment, computeTypeScopedIndex, buildPath } from './pathUtils';
import { applyOverride } from './applyOverrides';

type ElementProps = Record<string, unknown>;

export interface WalkOptions {
  config: MorphConfig;
  mode: MorphMode;
  wrapForEdit?: (element: ReactElement, path: string) => ReactElement;
}

export function walkTree(
  children: ReactNode,
  parentPath: string,
  options: WalkOptions,
): ReactNode {
  const { config, mode, wrapForEdit } = options;
  const childArray = Children.toArray(children);

  return Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;

    if (child.type === Fragment) {
      return walkTree((child.props as ElementProps).children as ReactNode, parentPath, options);
    }

    const typeScopedIndex = computeTypeScopedIndex(childArray, index);
    const segment = buildSegment(child, typeScopedIndex);
    const path = buildPath(parentPath, segment);

    const override = config[path];
    let modified = applyOverride(child, override, mode);

    if (modified === null) return null;
    if (!isValidElement(modified)) return modified;

    const modifiedProps = modified.props as ElementProps;
    const originalChildren = modifiedProps.children as ReactNode | undefined;

    if (originalChildren != null) {
      const walkedChildren = walkTree(originalChildren, path, options);
      modified = cloneElement(modified, {}, walkedChildren);
    }

    if (mode === 'edit' && wrapForEdit) {
      modified = wrapForEdit(modified, path);
    }

    return modified;
  });
}
