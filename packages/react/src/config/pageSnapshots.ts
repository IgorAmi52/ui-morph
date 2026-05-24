import type { GeneratedPageSourceSnapshot, GeneratedPageVisualFragment, LayoutSnapshot } from '../types';

const MAX_SNAPSHOTS = 12;
const MAX_VISUAL_FRAGMENTS = 8;
const MAX_FRAGMENT_HTML = 28000;
const STORAGE_PREFIX = 'ui-morph:page-snapshots';
const FRAGMENT_SELECTOR = [
  'table',
  '[role="table"]',
  '[role="grid"]',
  'svg',
  'img',
  'canvas',
  'video',
  'picture',
  '[role="img"]',
].join(',');
const TABLE_CONTAINER_CLASS_PATTERN =
  /card|panel|table|module/i;
const VISUAL_CONTAINER_CLASS_PATTERN =
  /card|panel|chart-card|widget|metric|module/i;

function storageKey(userId: string, sessionId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${sessionId}`;
}

function safeRead(raw: string | null): GeneratedPageSourceSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as GeneratedPageSourceSnapshot[] : [];
  } catch {
    return [];
  }
}

export function routeLabel(routeId: string, path: string): string {
  if (routeId === 'index') return 'Home';
  const label = routeId || path || 'Page';
  return label
    .replace(/^\/|\/$/g, '')
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || 'Page';
}

export function readPageSnapshots(userId: string, sessionId: string): GeneratedPageSourceSnapshot[] {
  if (typeof window === 'undefined') return [];
  return safeRead(window.localStorage.getItem(storageKey(userId, sessionId)));
}

function compactText(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 160 ? `${compact.slice(0, 159)}…` : compact;
}

function fragmentLabel(el: HTMLElement, fallback: string): string {
  const labelled = el.getAttribute('aria-label');
  if (labelled?.trim()) return compactText(labelled);
  const heading = el.querySelector('h1,h2,h3,h4,[role="heading"]');
  if (heading?.textContent?.trim()) return compactText(heading.textContent);
  if (el.textContent?.trim()) return compactText(el.textContent);
  return fallback;
}

function replaceCanvases(source: HTMLElement, clone: HTMLElement): void {
  const sourceCanvases = Array.from(source.querySelectorAll('canvas'));
  const cloneCanvases = Array.from(clone.querySelectorAll('canvas'));
  cloneCanvases.forEach((canvas, index) => {
    const sourceCanvas = sourceCanvases[index];
    if (!sourceCanvas) return;
    try {
      const img = document.createElement('img');
      img.src = sourceCanvas.toDataURL('image/png');
      img.alt = sourceCanvas.getAttribute('aria-label') ?? 'Chart';
      img.width = sourceCanvas.width;
      img.height = sourceCanvas.height;
      canvas.replaceWith(img);
    } catch {
      // Cross-origin canvas content cannot be serialized; keep the original clone.
    }
  });
}

function sanitizeClone(root: HTMLElement): void {
  const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  for (const el of all) {
    if (el.hasAttribute('data-morph-editor')) {
      el.remove();
      continue;
    }
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'IFRAME') {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  }
}

function fragmentKind(el: HTMLElement): GeneratedPageVisualFragment['kind'] {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  if (tag === 'table' || role === 'table' || role === 'grid') return 'table';
  if (tag === 'section' || tag === 'article') return 'section';
  return 'visual';
}

function numberAttr(el: HTMLElement, attr: string): number {
  const raw = el.getAttribute(attr);
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDecorativeVisual(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'svg' && tag !== 'img') return false;
  if (el.getAttribute('role') === 'img') return false;
  if (el.getAttribute('aria-label') || el.querySelector('title')) return false;
  const width = numberAttr(el, 'width');
  const height = numberAttr(el, 'height');
  return (width > 0 && width <= 32) || (height > 0 && height <= 32);
}

function isFragmentContainer(el: HTMLElement, kind: GeneratedPageVisualFragment['kind']): boolean {
  const className = String(el.getAttribute('class') ?? '');
  const tag = el.tagName.toLowerCase();
  if (tag === 'article' || tag === 'section') return true;
  if (kind === 'table') return TABLE_CONTAINER_CLASS_PATTERN.test(className);
  return VISUAL_CONTAINER_CLASS_PATTERN.test(className);
}

function captureTargetForFragment(fragment: HTMLElement, root: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = fragment;
  let best: HTMLElement | null = fragment.closest<HTMLElement>('[data-morph-path]');
  const kind = fragmentKind(fragment);
  let depth = 0;

  while (current && current !== root && depth < 6) {
    const morphEl: HTMLElement | null = current.closest('[data-morph-path]');
    if (!morphEl) break;
    if (isFragmentContainer(morphEl, kind)) {
      best = morphEl;
    }
    current = morphEl.parentElement;
    depth++;
  }

  return best;
}

function addFragmentTarget(targets: Set<HTMLElement>, target: HTMLElement): void {
  for (const existing of Array.from(targets)) {
    if (existing.contains(target)) return;
    if (target.contains(existing)) targets.delete(existing);
  }
  targets.add(target);
}

export function captureVisualFragments(
  container: HTMLElement,
  routeId: string,
): GeneratedPageVisualFragment[] {
  const targets = new Set<HTMLElement>();
  const fragments = Array.from(container.querySelectorAll<HTMLElement>(FRAGMENT_SELECTOR))
    .filter((el) => !el.closest('[data-morph-editor]') && !isDecorativeVisual(el));

  for (const fragment of fragments) {
    const target = captureTargetForFragment(fragment, container);
    if (target) addFragmentTarget(targets, target);
    if (targets.size >= MAX_VISUAL_FRAGMENTS) break;
  }

  return Array.from(targets).map((target, index) => {
    const clone = target.cloneNode(true) as HTMLElement;
    replaceCanvases(target, clone);
    sanitizeClone(clone);
    const html = clone.outerHTML.slice(0, MAX_FRAGMENT_HTML);
    const path = target.getAttribute('data-morph-path') ?? `${routeId}:${index}`;
    return {
      id: `visual-${routeId}-${index}`,
      label: fragmentLabel(target, routeLabel(routeId, '')),
      kind: target.querySelector('table,[role="table"],[role="grid"]')
        ? 'table'
        : fragmentKind(target),
      routeId,
      path,
      html,
      text: target.textContent?.trim() ? compactText(target.textContent) : undefined,
    };
  });
}

export function upsertPageSnapshot(
  userId: string,
  sessionId: string,
  input: {
    viewId: string;
    routeId: string;
    path: string;
    snapshot: LayoutSnapshot;
    container?: HTMLElement;
  },
): GeneratedPageSourceSnapshot[] {
  if (typeof window === 'undefined') return [];

  const entry: GeneratedPageSourceSnapshot = {
    viewId: input.viewId,
    routeId: input.routeId,
    path: input.path,
    label: routeLabel(input.routeId, input.path),
    capturedAt: new Date().toISOString(),
    snapshot: input.snapshot,
    visualFragments: input.container
      ? captureVisualFragments(input.container, input.routeId)
      : undefined,
  };
  const previous = readPageSnapshots(userId, sessionId)
    .filter((item) => item.routeId !== entry.routeId || item.path !== entry.path);
  const next = [entry, ...previous].slice(0, MAX_SNAPSHOTS);
  window.localStorage.setItem(storageKey(userId, sessionId), JSON.stringify(next));
  return next;
}
