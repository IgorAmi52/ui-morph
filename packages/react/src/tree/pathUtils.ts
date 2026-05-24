import { isValidElement, Children, type ReactElement } from 'react';

type ElementProps = Record<string, unknown>;

function getTypeName(element: ReactElement): string {
  const { type } = element;
  if (typeof type === 'string') return type;
  if (typeof type === 'function') {
    return (type as { displayName?: string }).displayName || type.name || 'Anonymous';
  }
  if (typeof type === 'symbol') {
    const desc = String(type);
    if (desc.includes('fragment')) return 'Fragment';
    return 'Symbol';
  }
  return 'Unknown';
}

export function buildSegment(element: ReactElement, typeScopedIndex: number): string {
  const props = element.props as ElementProps;
  const morphId = props['data-morph-id'];
  if (typeof morphId === 'string' && morphId.length > 0) {
    return `id:${morphId}`;
  }

  const typeName = getTypeName(element);

  const key = element.key;
  if (key !== null && key !== undefined) {
    const keyStr = String(key);
    if (!keyStr.startsWith('.')) {
      return `k:${keyStr}`;
    }
  }

  return `${typeName}:${typeScopedIndex}`;
}

export function computeTypeScopedIndex(
  childArray: ReturnType<typeof Children.toArray>,
  targetIndex: number,
): number {
  const target = childArray[targetIndex];
  if (!isValidElement(target)) return 0;

  const targetType = target.type;
  let count = 0;
  for (let i = 0; i < targetIndex; i++) {
    const sibling = childArray[i];
    if (isValidElement(sibling) && sibling.type === targetType) {
      count++;
    }
  }
  return count;
}

export function buildPath(parentPath: string, segment: string): string {
  return parentPath ? `${parentPath}.${segment}` : segment;
}
