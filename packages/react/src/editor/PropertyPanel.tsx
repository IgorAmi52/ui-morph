import { useState, useEffect, useCallback } from 'react';
import { useMorphContext } from '../config/ConfigContext';
import type { ElementOverride } from '../types';
import { VisibilityToggle } from './controls/VisibilityToggle';
import { TextEditor } from './controls/TextEditor';
import { ColorPicker } from './controls/ColorPicker';
import { SizeControl } from './controls/SizeControl';
import { AiPromptInput } from './controls/AiPromptInput';

type Tab = 'manual' | 'ai';

interface Defaults {
  text: string;
  color: string;
  bg: string;
  fontSize: string;
}

const EMPTY_DEFAULTS: Defaults = { text: '', color: '#000000', bg: '#ffffff', fontSize: '16px' };

function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  const [, r, g, b] = match;
  return '#' + [r, g, b].map(c => Number(c).toString(16).padStart(2, '0')).join('');
}

function readDefaults(path: string): Defaults {
  const el = document.querySelector<HTMLElement>(`[data-morph-path="${CSS.escape(path)}"]`);
  if (!el) return EMPTY_DEFAULTS;
  const computed = getComputedStyle(el);
  return {
    text: el.textContent ?? '',
    color: rgbToHex(computed.color),
    bg: rgbToHex(computed.backgroundColor),
    fontSize: computed.fontSize,
  };
}

export function PropertyPanel() {
  const { selectedPath, config, dispatch, selectElement } = useMorphContext();
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [defaults, setDefaults] = useState<Defaults>(EMPTY_DEFAULTS);

  const override = selectedPath ? config[selectedPath] ?? {} : {};

  useEffect(() => {
    if (!selectedPath) return;
    setDefaults(readDefaults(selectedPath));
  }, [selectedPath]);

  const updateOverride = useCallback(
    (changes: Partial<ElementOverride>) => {
      if (!selectedPath) return;
      dispatch({
        type: 'SET_OVERRIDE',
        payload: { path: selectedPath, override: changes },
      });
    },
    [dispatch, selectedPath],
  );

  const updateStyle = useCallback(
    (prop: string, value: string) => {
      updateOverride({ style: { ...override.style, [prop]: value } });
    },
    [updateOverride, override.style],
  );

  const clearStyleProp = useCallback(
    (prop: string) => {
      if (!override.style) return;
      const { [prop]: _, ...rest } = override.style;
      updateOverride({ style: Object.keys(rest).length > 0 ? rest : undefined });
    },
    [updateOverride, override.style],
  );

  const resetOverride = useCallback(() => {
    if (!selectedPath) return;
    dispatch({ type: 'REMOVE_OVERRIDE', payload: { path: selectedPath } });
  }, [dispatch, selectedPath]);

  if (!selectedPath) return null;

  return (
    <div data-morph-editor className="morph-editor-panel">
      <div className="morph-editor-panel__header">
        <div className="morph-editor-panel__path" title={selectedPath}>{selectedPath}</div>
        <button className="morph-editor-panel__close" onClick={() => selectElement(null)}>
          x
        </button>
      </div>

      <div className="morph-editor-panel__tabs">
        <button
          className={`morph-editor-panel__tab${activeTab === 'manual' ? ' morph-editor-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual
        </button>
        <button
          className={`morph-editor-panel__tab${activeTab === 'ai' ? ' morph-editor-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Prompt
        </button>
      </div>

      <div className="morph-editor-panel__body">
        {activeTab === 'manual' ? (
          <>
            <VisibilityToggle
              hidden={override.hidden ?? false}
              onChange={(hidden) => updateOverride({ hidden })}
            />
            <div className="morph-editor-separator" />
            <TextEditor
              text={override.text}
              placeholder={defaults.text}
              onChange={(text) => updateOverride({ text })}
              onClear={() => {
                const { text: _, ...rest } = override;
                if (!selectedPath) return;
                dispatch({ type: 'SET_CONFIG', payload: { ...config, [selectedPath]: rest } });
              }}
            />
            <div className="morph-editor-separator" />
            <ColorPicker
              label="Text color"
              value={override.style?.color ?? defaults.color}
              onChange={(color) => updateStyle('color', color)}
              onClear={() => clearStyleProp('color')}
            />
            <ColorPicker
              label="Background"
              value={override.style?.backgroundColor ?? defaults.bg}
              onChange={(bg) => updateStyle('backgroundColor', bg)}
              onClear={() => clearStyleProp('backgroundColor')}
            />
            <SizeControl
              fontSize={override.style?.fontSize ?? defaults.fontSize}
              onChange={(fs) => updateStyle('fontSize', fs)}
              onClear={() => clearStyleProp('fontSize')}
            />
            <div className="morph-editor-separator" />
            <button
              className="morph-editor-btn morph-editor-btn--danger morph-editor-btn--full"
              onClick={resetOverride}
            >
              Reset all overrides
            </button>
          </>
        ) : (
          <AiPromptInput path={selectedPath} />
        )}
      </div>
    </div>
  );
}
