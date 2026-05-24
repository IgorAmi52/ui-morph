import { describe, expect, it } from 'vitest';
import { configReducer, initialConfig } from './configReducer';

describe('configReducer', () => {
  it('returns initial state for unknown actions via exhaustiveness', () => {
    const state = { 'morph.div:0': { hidden: true } };
    expect(
      configReducer(state, { type: 'SET_CONFIG', payload: { 'morph.p:0': { text: 'Hi' } } }),
    ).toEqual({ 'morph.p:0': { text: 'Hi' } });
  });

  it('SET_OVERRIDE adds a new path', () => {
    expect(
      configReducer(initialConfig, {
        type: 'SET_OVERRIDE',
        payload: { path: 'morph.div:0', override: { hidden: true } },
      }),
    ).toEqual({ 'morph.div:0': { hidden: true } });
  });

  it('SET_OVERRIDE merges into an existing path', () => {
    const state = { 'morph.div:0': { style: { color: 'red' } } };
    expect(
      configReducer(state, {
        type: 'SET_OVERRIDE',
        payload: { path: 'morph.div:0', override: { hidden: true } },
      }),
    ).toEqual({
      'morph.div:0': { style: { color: 'red' }, hidden: true },
    });
  });

  it('REMOVE_OVERRIDE drops a path', () => {
    const state = {
      'morph.div:0': { hidden: true },
      'morph.div:1': { text: 'Keep' },
    };
    expect(
      configReducer(state, {
        type: 'REMOVE_OVERRIDE',
        payload: { path: 'morph.div:0' },
      }),
    ).toEqual({ 'morph.div:1': { text: 'Keep' } });
  });

  it('RESET_CONFIG clears all overrides', () => {
    expect(
      configReducer(
        { 'morph.div:0': { hidden: true } },
        { type: 'RESET_CONFIG' },
      ),
    ).toEqual({});
  });

  it('REORDER_CHILDREN sets childOrder on parent path', () => {
    expect(
      configReducer(initialConfig, {
        type: 'REORDER_CHILDREN',
        payload: { parentPath: 'morph.div:0', childOrder: ['p:0', 'h1:0'] },
      }),
    ).toEqual({ 'morph.div:0': { childOrder: ['p:0', 'h1:0'] } });
  });

  it('REORDER_CHILDREN preserves other fields on parent path', () => {
    const state = { 'morph.div:0': { hidden: true } };
    expect(
      configReducer(state, {
        type: 'REORDER_CHILDREN',
        payload: { parentPath: 'morph.div:0', childOrder: ['p:0'] },
      }),
    ).toEqual({
      'morph.div:0': { hidden: true, childOrder: ['p:0'] },
    });
  });
});
