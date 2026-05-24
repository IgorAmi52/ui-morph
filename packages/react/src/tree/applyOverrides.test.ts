import { createElement, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import { applyOverride } from './applyOverrides';

describe('applyOverride', () => {
  it('returns element unchanged when no override', () => {
    const el = createElement('h1', null, 'Title');
    expect(applyOverride(el, undefined, 'view')).toBe(el);
  });

  it('hides element in view mode', () => {
    const el = createElement('div', null, 'Hidden');
    expect(applyOverride(el, { hidden: true }, 'view')).toBeNull();
  });

  it('hides element in edit mode', () => {
    const el = createElement('motion.div', null, 'Hidden');
    const result = applyOverride(el, { hidden: true }, 'edit');
    expect(isValidElement(result)).toBe(true);
    if (isValidElement(result)) {
      expect((result.props as { style?: { display?: string } }).style?.display).toBe('none');
    }
  });

  it('merges style overrides', () => {
    const el = createElement('p', { style: { color: 'black' } }, 'Text');
    const result = applyOverride(el, { style: { fontSize: '18px' } }, 'view');
    expect(isValidElement(result)).toBe(true);
    if (isValidElement(result)) {
      const props = result.props as { style?: Record<string, string> };
      expect(props.style).toEqual({ color: 'black', fontSize: '18px' });
    }
  });
});
