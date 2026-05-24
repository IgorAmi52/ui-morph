import { describe, expect, it } from 'vitest';
import {
  applyAiPrompt,
  applyOverride,
  getConfig,
  saveConfig,
} from '../services/configService.js';
import { ValidationError } from '../services/validationService.js';

describe('configService', () => {
  it('returns empty config when none exists', async () => {
    await expect(getConfig('user-a', 'dashboard')).resolves.toEqual({});
  });

  it('persists and loads config for a user/view pair', async () => {
    const overrides = {
      'morph.div:0.h1:0': { style: { color: 'red', fontSize: '24px' } },
    };

    await saveConfig('user-a', 'dashboard', overrides);
    await expect(getConfig('user-a', 'dashboard')).resolves.toEqual(overrides);
  });

  it('upserts config on save', async () => {
    await saveConfig('user-a', 'dashboard', {
      'morph.div:0': { hidden: true },
    });

    const updated = {
      'morph.div:0': { text: 'Updated title' },
    };

    await saveConfig('user-a', 'dashboard', updated);
    await expect(getConfig('user-a', 'dashboard')).resolves.toEqual(updated);
  });

  it('scopes config by userId and viewId', async () => {
    await saveConfig('user-a', 'dashboard', {
      'morph.div:0': { hidden: true },
    });
    await saveConfig('user-b', 'dashboard', {
      'morph.div:0': { text: 'Other user' },
    });
    await saveConfig('user-a', 'settings', {
      'morph.div:0': { text: 'Settings view' },
    });

    await expect(getConfig('user-a', 'dashboard')).resolves.toEqual({
      'morph.div:0': { hidden: true },
    });
    await expect(getConfig('user-b', 'dashboard')).resolves.toEqual({
      'morph.div:0': { text: 'Other user' },
    });
    await expect(getConfig('user-a', 'settings')).resolves.toEqual({
      'morph.div:0': { text: 'Settings view' },
    });
  });

  it('rejects invalid overrides on save', async () => {
    await expect(
      saveConfig('user-a', 'dashboard', {
        'morph.div:0': { style: { color: 'javascript:alert(1)' } },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('merges a manual override into existing config', async () => {
    await saveConfig('user-a', 'dashboard', {
      'morph.div:0.h1:0': { style: { color: 'red' } },
    });

    const result = await applyOverride('user-a', 'dashboard', 'morph.div:1', {
      hidden: true,
    });

    expect(result).toEqual({
      'morph.div:0.h1:0': { style: { color: 'red' } },
      'morph.div:1': { hidden: true },
    });
    await expect(getConfig('user-a', 'dashboard')).resolves.toEqual(result);
  });

  it('returns current config unchanged for ai prompts', async () => {
    const initial = {
      'morph.div:0': { text: 'Hello' },
    };
    await saveConfig('user-a', 'dashboard', initial);

    const result = await applyAiPrompt(
      'user-a',
      'dashboard',
      'morph.div:0',
      'make this blue',
    );

    expect(result).toEqual(initial);
    await expect(getConfig('user-a', 'dashboard')).resolves.toEqual(initial);
  });
});
