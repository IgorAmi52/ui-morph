import { cloneElement, type ReactElement, type ReactNode } from 'react';
import type { ElementOverride, MorphMode } from '../types';

type ElementProps = Record<string, unknown>;

export function applyOverride(
  element: ReactElement,
  override: ElementOverride | undefined,
  mode: MorphMode,
): ReactNode {
  if (!override) return element;

  if (override.hidden && mode === 'view') return null;

  const props = element.props as ElementProps;
  const propsToMerge: ElementProps = {};

  if (override.style) {
    const existing = (props.style as Record<string, string> | undefined) ?? {};
    propsToMerge.style = { ...existing, ...override.style };
  }

  if (override.hidden && mode === 'edit') {
    const current = (propsToMerge.style as Record<string, string>) ??
      (props.style as Record<string, string> | undefined) ?? {};
    propsToMerge.style = { ...current, opacity: '0.3' };
  }

  if (Object.keys(propsToMerge).length === 0) return element;
  return cloneElement(element, propsToMerge);
}
