export type MorphCapability =
  | 'visibility'
  | 'textColor'
  | 'background'
  | 'resize'
  | 'reorder'
  | 'ai';

const ALL_CAPABILITIES: MorphCapability[] = [
  'visibility',
  'textColor',
  'background',
  'resize',
  'reorder',
  'ai',
];

type CapabilityToken = MorphCapability | 'all' | 'style';

const TOKEN_ALIASES: Record<string, CapabilityToken> = {
  all: 'all',
  lock: 'all',
  locked: 'all',
  hide: 'visibility',
  visibility: 'visibility',
  visible: 'visibility',
  novisibility: 'visibility',
  notvisibility: 'visibility',
  notvisible: 'visibility',
  color: 'textColor',
  textcolor: 'textColor',
  text: 'textColor',
  nocolor: 'textColor',
  notcolor: 'textColor',
  nottextcolor: 'textColor',
  background: 'background',
  bgcolor: 'background',
  nobackground: 'background',
  notbackground: 'background',
  resize: 'resize',
  resizable: 'resize',
  noresize: 'resize',
  noresizable: 'resize',
  notresize: 'resize',
  notresizable: 'resize',
  size: 'resize',
  fontsize: 'resize',
  reorder: 'reorder',
  order: 'reorder',
  move: 'reorder',
  drag: 'reorder',
  noreorder: 'reorder',
  noorder: 'reorder',
  nomove: 'reorder',
  nodrag: 'reorder',
  notreorder: 'reorder',
  notmove: 'reorder',
  ai: 'ai',
  agent: 'ai',
  prompt: 'ai',
  noai: 'ai',
  noagent: 'ai',
  noprompt: 'ai',
  style: 'style',
  styles: 'style',
};

const IMPLICIT_NON_RESIZABLE_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

function normalizeToken(token: string): string {
  return token.trim().toLowerCase().replace(/[^a-z]/g, '');
}

function resolveToken(token: string): CapabilityToken | undefined {
  return TOKEN_ALIASES[normalizeToken(token)];
}

function addCapability(disabled: Set<MorphCapability>, alias: CapabilityToken): void {
  if (alias === 'all') {
    ALL_CAPABILITIES.forEach((capability) => disabled.add(capability));
    return;
  }

  if (alias === 'style') {
    disabled.add('textColor');
    disabled.add('background');
    disabled.add('resize');
    return;
  }

  disabled.add(alias);
}

function removeCapability(disabled: Set<MorphCapability>, alias: CapabilityToken): void {
  if (alias === 'all') {
    ALL_CAPABILITIES.forEach((capability) => disabled.delete(capability));
    return;
  }

  if (alias === 'style') {
    disabled.delete('textColor');
    disabled.delete('background');
    disabled.delete('resize');
    return;
  }

  disabled.delete(alias);
}

function addTokens(disabled: Set<MorphCapability>, raw: string | null): void {
  if (!raw) return;
  raw.split(/[\s,]+/).forEach((token) => {
    const alias = resolveToken(token);
    if (alias) addCapability(disabled, alias);
  });
}

function removeTokens(disabled: Set<MorphCapability>, raw: string | null): void {
  if (!raw) return;
  raw.split(/[\s,]+/).forEach((token) => {
    const alias = resolveToken(token);
    if (alias) removeCapability(disabled, alias);
  });
}

function addImplicitDisabledCapabilities(disabled: Set<MorphCapability>, el: HTMLElement): void {
  if (IMPLICIT_NON_RESIZABLE_TAGS.has(el.tagName)) {
    disabled.add('resize');
  }
}

export function getDisabledCapabilities(el: HTMLElement | null): Set<MorphCapability> {
  const disabled = new Set<MorphCapability>();
  if (!el) return disabled;

  addImplicitDisabledCapabilities(disabled, el);

  const lineage: HTMLElement[] = [];
  let current: HTMLElement | null = el;
  while (current) {
    lineage.unshift(current);
    current = current.parentElement;
  }

  if (lineage.some((node) => node.hasAttribute('data-morph-lock') || node.hasAttribute('data-morph-locked'))) {
    addCapability(disabled, 'all');
    return disabled;
  }

  for (const node of lineage) {
    addTokens(disabled, node.getAttribute('data-morph-disable'));
    addTokens(disabled, node.getAttribute('data-morph-disabled'));
    removeTokens(disabled, node.getAttribute('data-morph-enable'));
    removeTokens(disabled, node.getAttribute('data-morph-enabled'));
  }

  return disabled;
}

export function isCapabilityEnabled(
  disabled: Set<MorphCapability>,
  capability: MorphCapability,
): boolean {
  return !disabled.has(capability);
}
