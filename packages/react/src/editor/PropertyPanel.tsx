import { useState, useEffect, useCallback } from 'react';
import { useMorphContext } from '../config/ConfigContext';
import type { ElementOverride } from '../types';
import { VisibilityToggle } from './controls/VisibilityToggle';
import { ColorPicker } from './controls/ColorPicker';
import { SizeControl } from './controls/SizeControl';
import { AiPromptInput } from './controls/AiPromptInput';
import {
  getDisabledCapabilities,
  isCapabilityEnabled,
  type MorphCapability,
} from './capabilities';

type Tab = 'manual' | 'ai';

interface Defaults {
  color: string;
  bg: string;
  fontSize: string;
}

interface SelectedElementState {
  defaults: Defaults;
  disabledCapabilities: Set<MorphCapability>;
}

const EMPTY_DEFAULTS: Defaults = {
  color: '#000000',
  bg: '#ffffff',
  fontSize: '16px',
};
const EMPTY_STATE: SelectedElementState = {
  defaults: EMPTY_DEFAULTS,
  disabledCapabilities: new Set(),
};

function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  const [, r, g, b] = match;
  return '#' + [r, g, b].map(c => Number(c).toString(16).padStart(2, '0')).join('');
}

function readSelectedElementState(path: string): SelectedElementState {
  const el = document.querySelector<HTMLElement>(`[data-morph-path="${CSS.escape(path)}"]`);
  if (!el) return EMPTY_STATE;
  const computed = getComputedStyle(el);
  return {
    defaults: {
      color: rgbToHex(computed.color),
      bg: rgbToHex(computed.backgroundColor),
      fontSize: computed.fontSize,
    },
    disabledCapabilities: getDisabledCapabilities(el),
  };
}

export function PropertyPanel() {
  const { selectedPath, config, dispatch, selectElement } = useMorphContext();
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [elementState, setElementState] = useState<SelectedElementState>(EMPTY_STATE);

  const override = selectedPath ? config[selectedPath] ?? {} : {};
  const { defaults, disabledCapabilities } = elementState;
  const canChangeVisibility = isCapabilityEnabled(disabledCapabilities, 'visibility');
  const canChangeTextColor = isCapabilityEnabled(disabledCapabilities, 'textColor');
  const canChangeBackground = isCapabilityEnabled(disabledCapabilities, 'background');
  const canResize = isCapabilityEnabled(disabledCapabilities, 'resize');
  const canUseAi = isCapabilityEnabled(disabledCapabilities, 'ai');
  const hasManualControls = canChangeVisibility || canChangeTextColor || canChangeBackground || canResize;

  useEffect(() => {
    if (!selectedPath) return;
    setElementState(readSelectedElementState(selectedPath));
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
        <div className="morph-editor-panel__title">Element settings</div>
        <button
          className="morph-editor-panel__close"
          onClick={() => selectElement(null)}
          aria-label="Close"
        >
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
          disabled={!canUseAi}
        >
          AI Prompt
        </button>
      </div>

      <div className="morph-editor-panel__body">
        {activeTab === 'manual' ? (
          <>
            {!hasManualControls && (
              <div className="morph-editor-empty">No manual controls available for this element.</div>
            )}
            {canChangeVisibility && (
              <>
                <VisibilityToggle
                  hidden={override.hidden ?? false}
                  onChange={(hidden) => updateOverride({ hidden })}
                />
                <div className="morph-editor-separator" />
              </>
            )}
            {canChangeTextColor && (
              <ColorPicker
                label="Text color"
                value={override.style?.color ?? defaults.color}
                onChange={(color) => updateStyle('color', color)}
                onClear={() => clearStyleProp('color')}
              />
            )}
            {canChangeBackground && (
              <ColorPicker
                label="Background"
                value={override.style?.backgroundColor ?? defaults.bg}
                onChange={(bg) => updateStyle('backgroundColor', bg)}
                onClear={() => clearStyleProp('backgroundColor')}
              />
            )}
            {canResize && (
              <SizeControl
                fontSize={override.style?.fontSize ?? defaults.fontSize}
                isOverridden={override.style?.fontSize !== undefined}
                onChange={(fs) => updateStyle('fontSize', fs)}
                onClear={() => clearStyleProp('fontSize')}
              />
            )}
            {hasManualControls && (
              <>
                <div className="morph-editor-separator" />
                <button
                  className="morph-editor-btn morph-editor-btn--danger morph-editor-btn--full"
                  onClick={resetOverride}
                >
                  Reset all overrides
                </button>
              </>
            )}
          </>
        ) : canUseAi ? (
          <AiPromptInput />
        ) : (
          <div className="morph-editor-empty">AI prompts are disabled for this element.</div>
        )}
      </div>
    </div>
  );
}
