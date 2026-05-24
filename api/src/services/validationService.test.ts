import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  validateAgentMessageRequest,
  validateConfig,
  validateOverride,
  validateOverrideRequest,
} from '../services/validationService.js';

describe('validateOverride', () => {
  it('accepts valid style overrides', () => {
    expect(
      validateOverride({
        style: { color: 'red', fontSize: '18px', backgroundColor: '#fff', gridColumn: 'span 4' },
      }),
    ).toEqual({
      style: { color: 'red', fontSize: '18px', backgroundColor: '#fff', gridColumn: 'span 4' },
    });
  });

  it('accepts hidden flag', () => {
    expect(validateOverride({ hidden: true })).toEqual({ hidden: true });
  });

  it('accepts text and strips HTML tags', () => {
    expect(validateOverride({ text: 'Hello <b>world</b>' })).toEqual({
      text: 'Hello world',
    });
  });

  it('accepts childOrder segment arrays', () => {
    expect(
      validateOverride({ childOrder: ['div:1', 'div:0'] }),
    ).toEqual({ childOrder: ['div:1', 'div:0'] });
  });

  it('rejects unknown CSS properties', () => {
    expect(() =>
      validateOverride({ style: { position: 'fixed' } }),
    ).toThrowError(new ValidationError('CSS property "position" is not allowed'));
  });

  it('rejects javascript: in CSS values', () => {
    expect(() =>
      validateOverride({ style: { color: 'javascript:alert(1)' } }),
    ).toThrowError(
      new ValidationError('CSS value for "color" contains disallowed content'),
    );
  });

  it('rejects url() in CSS values', () => {
    expect(() =>
      validateOverride({ style: { backgroundColor: 'url(http://evil.test/x)' } }),
    ).toThrowError(
      new ValidationError('CSS value for "backgroundColor" contains disallowed content'),
    );
  });

  it('rejects script tags in text', () => {
    expect(() =>
      validateOverride({ text: '<script>alert(1)</script>' }),
    ).toThrowError(new ValidationError('Text contains disallowed script content'));
  });

  it('rejects non-boolean hidden', () => {
    expect(() => validateOverride({ hidden: 'yes' as unknown as boolean })).toThrowError(
      new ValidationError('hidden must be a boolean'),
    );
  });

  it('rejects empty childOrder', () => {
    expect(() => validateOverride({ childOrder: [] })).toThrowError(
      new ValidationError('childOrder must be a non-empty array'),
    );
  });

  it('rejects non-object style', () => {
    expect(() => validateOverride({ style: 'red' as unknown as Record<string, string> })).toThrowError(
      new ValidationError('style must be an object'),
    );
  });
});

describe('validateConfig', () => {
  it('validates a full config map', () => {
    const input = {
      'morph.div:0.h1:0': { style: { color: 'blue' } },
      'morph.div:1': { hidden: true },
    };

    expect(validateConfig(input)).toEqual(input);
  });

  it('rejects empty path keys', () => {
    expect(() => validateConfig({ '': { hidden: true } })).toThrowError(
      new ValidationError('Override paths must be non-empty'),
    );
  });

  it('rejects non-object override values', () => {
    expect(() => validateConfig({ 'morph.div:0': 'bad' })).toThrowError(
      new ValidationError('Override for "morph.div:0" must be an object'),
    );
  });
});

describe('validateOverrideRequest', () => {
  it('accepts manual override requests', () => {
    expect(
      validateOverrideRequest({
        userId: 'user-1',
        viewId: 'dashboard',
        path: 'morph.div:0',
        type: 'manual',
        changes: { hidden: true },
      }),
    ).toEqual({
      userId: 'user-1',
      viewId: 'dashboard',
      path: 'morph.div:0',
      type: 'manual',
      changes: { hidden: true },
    });
  });

  it('accepts agent edit scope metadata', () => {
    expect(
      validateAgentMessageRequest({
        userId: 'user-1',
        viewId: 'dashboard',
        message: 'make this compact',
        config: {},
        snapshot: {
          viewId: 'dashboard',
          nodeCount: 1,
          nodes: [
            {
              path: 'morph.div:0',
              tag: 'div',
              segment: 'div:0',
              textLeaf: false,
              hidden: false,
              layout: {
                display: 'block',
                isGridItem: true,
                gridColumn: 'span 3',
                columnSpan: 3,
                maxColumnSpan: 12,
              },
              bounds: { width: 240, height: 120 },
              capabilities: {
                visibility: true,
                text: false,
                style: true,
                resize: true,
                reorder: true,
              },
              children: [],
            },
          ],
        },
        editScope: {
          rootPath: 'morph',
          mode: 'selected-subtree',
          allowedPaths: ['morph.div:0'],
          allowedParentPaths: [],
        },
      }).editScope,
    ).toEqual({
      rootPath: 'morph',
      mode: 'selected-subtree',
      allowedPaths: ['morph.div:0'],
      allowedParentPaths: [],
    });
  });

  it('accepts ai_prompt override requests', () => {
    expect(
      validateOverrideRequest({
        userId: 'user-1',
        viewId: 'dashboard',
        path: 'morph.div:0',
        type: 'ai_prompt',
        prompt: ' make this bigger ',
      }),
    ).toEqual({
      userId: 'user-1',
      viewId: 'dashboard',
      path: 'morph.div:0',
      type: 'ai_prompt',
      prompt: 'make this bigger',
    });
  });

  it('requires userId, viewId, and path', () => {
    expect(() =>
      validateOverrideRequest({ viewId: 'x', path: 'y', type: 'manual', changes: {} }),
    ).toThrowError(new ValidationError('userId is required'));
  });

  it('requires changes for manual type', () => {
    expect(() =>
      validateOverrideRequest({
        userId: 'u',
        viewId: 'v',
        path: 'p',
        type: 'manual',
      }),
    ).toThrowError(new ValidationError('changes is required for manual overrides'));
  });

  it('requires prompt for ai_prompt type', () => {
    expect(() =>
      validateOverrideRequest({
        userId: 'u',
        viewId: 'v',
        path: 'p',
        type: 'ai_prompt',
      }),
    ).toThrowError(new ValidationError('prompt is required for ai_prompt overrides'));
  });

  it('rejects invalid type', () => {
    expect(() =>
      validateOverrideRequest({
        userId: 'u',
        viewId: 'v',
        path: 'p',
        type: 'magic',
        changes: {},
      }),
    ).toThrowError(new ValidationError('type must be "manual" or "ai_prompt"'));
  });
});
