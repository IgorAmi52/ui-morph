import { describe, expect, it } from 'vitest';
import { captureVisualFragments } from './pageSnapshots';

describe('pageSnapshots', () => {
  it('captures tables as exact fragments and ignores decorative icons', () => {
    const container = document.createElement('main');
    container.innerHTML = `
      <section class="card" data-morph-path="morph.section:0">
        <h2 data-morph-path="morph.section:0.h2:0">Claims</h2>
        <div class="data-table-wrap" data-morph-path="morph.section:0.div:0">
          <table class="data-table" data-morph-path="morph.section:0.div:0.table:0">
            <thead>
              <tr><th>Claim <svg width="12" height="12"><path d="M0 0h1" /></svg></th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>CLM-001</td><td>Open</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `;

    const fragments = captureVisualFragments(container, 'claims');

    expect(fragments).toHaveLength(1);
    expect(fragments[0]).toMatchObject({
      kind: 'table',
      routeId: 'claims',
      path: 'morph.section:0',
    });
    expect(fragments[0].html).toContain('<table');
    expect(fragments[0].html).toContain('CLM-001');
  });

  it('captures chart cards separately instead of their grid parent', () => {
    const container = document.createElement('main');
    container.innerHTML = `
      <div class="chart-grid" data-morph-path="morph.div:0">
        <div class="chart-card" data-morph-path="morph.div:0.div:0">
          <div class="chart-card__title" data-morph-path="morph.div:0.div:0.div:0">Premiums vs claims paid</div>
          <div data-morph-path="morph.div:0.div:0.div:1">
            <svg role="img" aria-label="Premium chart" data-morph-path="morph.div:0.div:0.div:1.svg:0"></svg>
          </div>
        </div>
        <div class="chart-card" data-morph-path="morph.div:0.div:1">
          <div class="chart-card__title" data-morph-path="morph.div:0.div:1.div:0">Policies by type</div>
          <div data-morph-path="morph.div:0.div:1.div:1">
            <svg role="img" aria-label="Policies by type donut chart" data-morph-path="morph.div:0.div:1.div:1.svg:0"></svg>
          </div>
        </div>
      </div>
    `;

    const fragments = captureVisualFragments(container, 'dashboard');

    expect(fragments).toHaveLength(2);
    expect(fragments.map((fragment) => fragment.path)).toEqual([
      'morph.div:0.div:0',
      'morph.div:0.div:1',
    ]);
    expect(fragments[1].label).toContain('Policies by type');
    expect(fragments[1].html).not.toContain('Premiums vs claims paid');
  });
});
