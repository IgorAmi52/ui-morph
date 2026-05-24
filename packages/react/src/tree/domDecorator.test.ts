import { describe, expect, it } from 'vitest';
import {
  applyDomOverrides,
  cleanDomOverrides,
  decoratePaths,
  getParentPath,
  getSegment,
} from './domDecorator';

function buildSampleTree(): HTMLElement {
  document.body.innerHTML = `
    <motion.div id="root">
      <motion.div data-morph-id="header">
        <h1>Title</h1>
        <p>Body</p>
      </motion.div>
      <motion.div data-morph-passthrough>
        <span>Skipped subtree</span>
      </motion.div>
    </motion.div>
  `;
  return document.getElementById('root')!;
}

describe('path helpers', () => {
  it('extracts parent path and segment', () => {
    expect(getParentPath('morph.div:0.h1:0')).toBe('morph.div:0');
    expect(getSegment('morph.div:0.h1:0')).toBe('h1:0');
    expect(getParentPath('morph.div:0')).toBe('morph');
    expect(getParentPath('morph')).toBeNull();
    expect(getSegment('morph.div:0')).toBe('div:0');
  });
});

describe('decoratePaths', () => {
  it('assigns stable paths from data-morph-id and type-scoped index', () => {
    const root = buildSampleTree();
    decoratePaths(root, 'morph');

    const header = root.querySelector('[data-morph-id="header"]')!;
    expect(header.getAttribute('data-morph-path')).toBe('morph.id:header');
    expect(header.querySelector('h1')?.getAttribute('data-morph-path')).toBe(
      'morph.id:header.h1:0',
    );
    expect(header.querySelector('p')?.getAttribute('data-morph-path')).toBe(
      'morph.id:header.p:0',
    );
  });

  it('honors passthrough subtrees without assigning path to wrapper', () => {
    const root = buildSampleTree();
    decoratePaths(root, 'morph');

    const passthrough = root.querySelector('[data-morph-passthrough]')!;
    expect(passthrough.hasAttribute('data-morph-path')).toBe(false);
    expect(passthrough.querySelector('span')?.getAttribute('data-morph-path')).toBe('morph.span:0');
  });
});

describe('applyDomOverrides', () => {
  it('applies hidden, style, and text overrides', () => {
    const root = buildSampleTree();
    decoratePaths(root, 'morph');

    applyDomOverrides(root, {
      'morph.id:header.h1:0': { style: { color: 'red' }, text: 'New title' },
      'morph.id:header.p:0': { hidden: true },
    }, 'view');

    const h1 = root.querySelector('[data-morph-path="morph.id:header.h1:0"]') as HTMLElement;
    const p = root.querySelector('[data-morph-path="morph.id:header.p:0"]') as HTMLElement;

    expect(h1.style.color).toBe('red');
    expect(h1.textContent).toBe('New title');
    expect(p.style.display).toBe('none');
    expect(p.hasAttribute('data-morph-hidden-preview')).toBe(false);
  });

  it('shows hidden elements as selectable previews in edit mode', () => {
    const root = buildSampleTree();
    decoratePaths(root, 'morph');

    applyDomOverrides(root, {
      'morph.id:header.p:0': { hidden: true },
    }, 'edit');

    const p = root.querySelector('[data-morph-path="morph.id:header.p:0"]') as HTMLElement;

    expect(p.style.display).not.toBe('none');
    expect(p.getAttribute('data-morph-hidden-preview')).toBe('true');
  });

  it('reorders children by segment', () => {
    const root = buildSampleTree();
    decoratePaths(root, 'morph');

    applyDomOverrides(root, {
      'morph.id:header': { childOrder: ['p:0', 'h1:0'] },
    }, 'view');

    const header = root.querySelector('[data-morph-id="header"]')!;
    const orders = Array.from(header.children).map((child) => ({
      segment: getSegment(child.getAttribute('data-morph-path')!),
      order: (child as HTMLElement).style.order,
    }));
    expect(orders).toEqual([
      { segment: 'h1:0', order: '1' },
      { segment: 'p:0', order: '0' },
    ]);
  });

  it('cleanDomOverrides restores original DOM state', () => {
    const root = buildSampleTree();
    decoratePaths(root, 'morph');

    const config = {
      'morph.id:header.h1:0': { style: { color: 'red' }, text: 'Changed' },
      'morph.id:header.p:0': { hidden: true },
      'morph.id:header': { childOrder: ['p:0', 'h1:0'] },
    };

    applyDomOverrides(root, config, 'edit');
    cleanDomOverrides(root);

    const h1 = root.querySelector('[data-morph-path="morph.id:header.h1:0"]') as HTMLElement;
    const p = root.querySelector('[data-morph-path="morph.id:header.p:0"]') as HTMLElement;
    expect(h1.textContent).toBe('Title');
    expect(h1.style.color).toBe('');
    expect(p.hasAttribute('data-morph-hidden-preview')).toBe(false);

    const header = root.querySelector('[data-morph-id="header"]')!;
    const segments = Array.from(header.children).map((child) =>
      getSegment(child.getAttribute('data-morph-path')!),
    );
    expect(segments).toEqual(['h1:0', 'p:0']);
  });
});
