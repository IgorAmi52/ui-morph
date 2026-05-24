import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChatMarkdown } from './ChatMarkdown';

describe('ChatMarkdown', () => {
  it('renders bold and bullet lists', () => {
    const html = renderToStaticMarkup(
      createElement(ChatMarkdown, {
        content: 'Done! **Recent claims** is now above the charts.\n\n- First item\n- Second item',
      }),
    );
    expect(html).toContain('<strong>Recent claims</strong>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>First item</li>');
  });

  it('renders inline code and links', () => {
    const html = renderToStaticMarkup(
      createElement(ChatMarkdown, {
        content: 'See `docs` or [help](https://example.com).',
      }),
    );
    expect(html).toContain('<code>docs</code>');
    expect(html).toContain('href="https://example.com"');
  });
});
