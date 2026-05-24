import type { MorphConfig, MorphMode } from '../types';

export function getParentPath(fullPath: string): string | null {
  const lastDot = fullPath.lastIndexOf('.');
  return lastDot === -1 ? null : fullPath.substring(0, lastDot);
}

export function getSegment(fullPath: string): string {
  const lastDot = fullPath.lastIndexOf('.');
  return lastDot === -1 ? fullPath : fullPath.substring(lastDot + 1);
}

function computeSegment(el: HTMLElement): string {
  const morphId = el.getAttribute('data-morph-id');
  if (morphId) return `id:${morphId}`;

  const tag = el.tagName.toLowerCase();
  let index = 0;
  let sibling = el.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === el.tagName) index++;
    sibling = sibling.previousElementSibling;
  }
  return `${tag}:${index}`;
}

export function decoratePaths(container: HTMLElement, rootPath: string): void {
  const children = container.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    if (!(child instanceof HTMLElement)) continue;
    if (child.hasAttribute('data-morph-editor')) continue;

    if (child.hasAttribute('data-morph-passthrough')) {
      decoratePaths(child, rootPath);
      continue;
    }

    const segment = computeSegment(child);
    const path = `${rootPath}.${segment}`;
    child.setAttribute('data-morph-path', path);

    decoratePaths(child, path);
  }
}

const ORIGINAL_STYLE_ATTR = 'data-morph-original-style';
const ORIGINAL_DISPLAY_ATTR = 'data-morph-original-display';
const ORIGINAL_TEXT_ATTR = 'data-morph-original-text';
const HIDDEN_PREVIEW_ATTR = 'data-morph-hidden-preview';

function isTextLeaf(el: HTMLElement): boolean {
  return Array.from(el.childNodes).every(
    (node) => node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR'),
  );
}

function toCssPropertyName(prop: string): string {
  if (prop.startsWith('--')) return prop;
  return prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function preserveOriginalStyle(el: HTMLElement): void {
  if (!el.hasAttribute(ORIGINAL_STYLE_ATTR)) {
    el.setAttribute(ORIGINAL_STYLE_ATTR, el.getAttribute('style') ?? '');
  }
}

export function cleanDomOverrides(container: HTMLElement): void {
  const styleOverridden = Array.from(
    container.querySelectorAll<HTMLElement>(`[${ORIGINAL_STYLE_ATTR}]`),
  );
  if (container.hasAttribute(ORIGINAL_STYLE_ATTR)) styleOverridden.unshift(container);

  styleOverridden.forEach((el) => {
    const origStyle = el.getAttribute(ORIGINAL_STYLE_ATTR);
    if (origStyle !== null) {
      el.setAttribute('style', origStyle);
      el.removeAttribute(ORIGINAL_STYLE_ATTR);
    }
  });

  const decorated = container.querySelectorAll<HTMLElement>('[data-morph-path]');
  decorated.forEach((el) => {
    el.removeAttribute(HIDDEN_PREVIEW_ATTR);

    const origDisplay = el.getAttribute(ORIGINAL_DISPLAY_ATTR);
    if (origDisplay !== null) {
      el.style.display = origDisplay;
      el.removeAttribute(ORIGINAL_DISPLAY_ATTR);
    }

    const origText = el.getAttribute(ORIGINAL_TEXT_ATTR);
    if (origText !== null) {
      el.textContent = origText;
      el.removeAttribute(ORIGINAL_TEXT_ATTR);
    }
  });
}

function restoreOriginalDisplay(el: HTMLElement): void {
  const origDisplay = el.getAttribute(ORIGINAL_DISPLAY_ATTR);
  if (origDisplay === null) return;

  el.style.display = origDisplay;
  el.removeAttribute(ORIGINAL_DISPLAY_ATTR);
}

function ensureOrderableParent(parentEl: HTMLElement): void {
  const display = getComputedStyle(parentEl).display;
  if (display.includes('flex') || display.includes('grid')) return;
  if (display !== 'block' && display !== 'flow-root') return;

  preserveOriginalStyle(parentEl);
  parentEl.style.display = 'flex';
  parentEl.style.flexDirection = 'column';
}

function getOrderedChildren(parentEl: HTMLElement): HTMLElement[] {
  return Array.from(parentEl.children).filter(
    (ch): ch is HTMLElement =>
      ch instanceof HTMLElement && ch.hasAttribute('data-morph-path'),
  );
}

function applyOrderToChildren(children: HTMLElement[], childOrder: string[]): void {
  const orderMap = new Map<string, number>();
  childOrder.forEach((segment, index) => {
    orderMap.set(segment, index);
  });

  children.forEach((child, index) => {
    preserveOriginalStyle(child);

    const segment = getSegment(child.getAttribute('data-morph-path')!);
    child.style.order = String(orderMap.get(segment) ?? childOrder.length + index);
  });
}

function applyChildOrder(container: HTMLElement, config: MorphConfig): void {
  for (const [path, override] of Object.entries(config)) {
    if (!override.childOrder || override.childOrder.length === 0) continue;

    let parentEl = container.querySelector<HTMLElement>(
      `[data-morph-path="${CSS.escape(path)}"]`,
    );
    if (!parentEl && path === 'morph') {
      const passthrough = container.querySelector<HTMLElement>('[data-morph-passthrough]');
      parentEl = passthrough ?? container;
    }
    if (!parentEl) continue;

    ensureOrderableParent(parentEl);
    applyOrderToChildren(getOrderedChildren(parentEl), override.childOrder);
  }
}

export function applyDomOverrides(
  container: HTMLElement,
  config: MorphConfig,
  mode: MorphMode,
): void {
  applyChildOrder(container, config);

  const decorated = container.querySelectorAll<HTMLElement>('[data-morph-path]');
  decorated.forEach((el) => {
    const path = el.getAttribute('data-morph-path')!;
    const override = config[path];
    if (!override) return;

    el.removeAttribute(HIDDEN_PREVIEW_ATTR);
    if (!(override.hidden && mode === 'view')) {
      restoreOriginalDisplay(el);
    }

    if (override.style) {
      preserveOriginalStyle(el);
      for (const [prop, value] of Object.entries(override.style)) {
        el.style.setProperty(toCssPropertyName(prop), value);
      }
    }

    if (override.text !== undefined && isTextLeaf(el)) {
      if (!el.hasAttribute(ORIGINAL_TEXT_ATTR)) {
        el.setAttribute(ORIGINAL_TEXT_ATTR, el.textContent ?? '');
      }
      el.textContent = override.text;
    }

    if (override.hidden && mode === 'view') {
      if (!el.hasAttribute(ORIGINAL_DISPLAY_ATTR)) {
        el.setAttribute(ORIGINAL_DISPLAY_ATTR, el.style.display);
      }
      el.style.display = 'none';
    } else if (override.hidden && mode === 'edit') {
      el.setAttribute(HIDDEN_PREVIEW_ATTR, 'true');
    }
  });
}
