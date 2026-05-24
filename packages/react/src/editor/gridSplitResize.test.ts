import { describe, expect, it } from 'vitest';
import {
  applyBoundaryDelta,
  formatFrTracks,
  isSupportedGridTemplate,
  parseFrTracks,
  parseResolvedTrackWidths,
} from './gridSplitResize';

describe('gridSplitResize', () => {
  it('parses fr track templates', () => {
    expect(parseFrTracks('2fr 1fr')).toEqual([2, 1]);
    expect(parseFrTracks('1fr 1fr 1fr')).toEqual([1, 1, 1]);
    expect(parseFrTracks('1fr auto')).toBeNull();
  });

  it('parses resolved pixel track widths as weights', () => {
    expect(parseResolvedTrackWidths('600px 300px')).toEqual([600, 300]);
  });

  it('formats fr tracks', () => {
    expect(formatFrTracks([2, 1])).toBe('2fr 1fr');
  });

  it('rejects unsupported grid templates', () => {
    expect(isSupportedGridTemplate('repeat(auto-fit, minmax(200px, 1fr))')).toBe(false);
    expect(isSupportedGridTemplate('2fr 1fr')).toBe(true);
  });

  it('redistributes weight across a boundary', () => {
    expect(applyBoundaryDelta([2, 1], 0, 0.5)).toEqual([2.5, 0.5]);
    expect(applyBoundaryDelta([2, 1], 0, -2)).toBeNull();
  });
});
