import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { buildPath, buildSegment, computeTypeScopedIndex } from './pathUtils';

describe('buildPath', () => {
  it('joins parent path and segment', () => {
    expect(buildPath('morph.div:0', 'h1:0')).toBe('morph.div:0.h1:0');
  });

  it('returns segment alone when parent is empty', () => {
    expect(buildPath('', 'motion.div:0')).toBe('motion.div:0');
  });
});

describe('buildSegment', () => {
  it('prefers data-morph-id', () => {
    const el = createElement('motion.div', { 'data-morph-id': 'sidebar' });
    expect(buildSegment(el, 0)).toBe('id:sidebar');
  });

  it('uses React key when present', () => {
    const el = createElement('div', { key: 'header' });
    expect(buildSegment(el, 2)).toBe('k:header');
  });

  it('ignores auto-generated keys starting with dot', () => {
    const el = createElement('div', { key: '.0:abc' });
    expect(buildSegment(el, 1)).toBe('div:1');
  });

  it('falls back to type-scoped index', () => {
    const el = createElement('span', null);
    expect(buildSegment(el, 3)).toBe('span:3');
  });
});

describe('computeTypeScopedIndex', () => {
  it('counts only siblings of the same element type', () => {
    const children = [
      createElement('span', null),
      createElement('motion.div', null),
      createElement('span', null),
      createElement('div', null),
      createElement('span', null),
    ];

    expect(computeTypeScopedIndex(children, 0)).toBe(0);
    expect(computeTypeScopedIndex(children, 2)).toBe(1);
    expect(computeTypeScopedIndex(children, 4)).toBe(2);
    expect(computeTypeScopedIndex(children, 1)).toBe(0);
  });
});
