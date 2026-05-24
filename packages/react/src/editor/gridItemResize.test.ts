import { describe, expect, it } from 'vitest';
import { formatGridColumnSpan, parseGridSpan } from './gridItemResize';

describe('gridItemResize', () => {
  it('parses grid span values', () => {
    expect(parseGridSpan('span 3')).toBe(3);
    expect(parseGridSpan('auto / span 6')).toBe(6);
    expect(parseGridSpan('1 / span 4')).toBe(4);
    expect(parseGridSpan('auto')).toBeNull();
  });

  it('formats column span overrides', () => {
    expect(formatGridColumnSpan(5)).toBe('span 5');
  });
});
