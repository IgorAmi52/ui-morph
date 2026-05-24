import { useState, useEffect, useCallback } from 'react';
import { useMorphContext } from '../config/ConfigContext';
import { SparklesIcon } from './SparklesIcon';
import type { ElementOverride } from '../types';
import { VisibilityToggle } from './controls/VisibilityToggle';
import { ColorPicker } from './controls/ColorPicker';
import { SizeControl } from './controls/SizeControl';
import { AgentChat } from './controls/AgentChat';
import { useResizablePanel } from './useResizablePanel';
import {
  getDisabledCapabilities,
  isCapabilityEnabled,
  type MorphCapability,
} from './capabilities';

type Tab = 'chat' | 'manual';
type PanelSide = 'left' | 'right';

interface Defaults {
  color: string;
  bg: string;
  fontSize: string;
}

interface SelectedElementState {
  defaults: Defaults;
  disabledCapabilities: Set<MorphCapability>;
  panelSide: PanelSide;
}

const EMPTY_DEFAULTS: Defaults = {
  color: '#000000',
  bg: '#ffffff',
  fontSize: '16px',
};
const EMPTY_STATE: SelectedElementState = {
  defaults: EMPTY_DEFAULTS,
  disabledCapabilities: new Set(),
  panelSide: 'right',
};

function colorChannelToHex(channel: string): string {
  return Math.round(Number(channel)).toString(16).padStart(2, '0');
}

function parseAlpha(alpha: string | undefined): number {
  if (!alpha) return 1;
  if (alpha.endsWith('%')) return Number(alpha.slice(0, -1)) / 100;
  return Number(alpha);
}

function rgbToHex(rgb: string): string | null {
  const commaMatch = rgb.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*([\d.]+%?))?\s*\)$/,
  );
  const spaceMatch = rgb.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/,
  );
  const match = commaMatch ?? spaceMatch;
  if (!match) return null;

  const [, r, g, b, alpha] = match;
  if (parseAlpha(alpha) === 0) return null;
  return `#${[r, g, b].map(colorChannelToHex).join('')}`;
}

function cssColorToHex(color: string, fallback: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
  return rgbToHex(color) ?? fallback;
}

function resolveEffectiveBackgroundHex(el: HTMLElement): string {
  let current: HTMLElement | null = el;
  while (current) {
    const hex = rgbToHex(getComputedStyle(current).backgroundColor);
    if (hex) return hex;
    current = current.parentElement;
  }
  return '#ffffff';
}

function resolvePanelSide(el: HTMLElement, panelWidth: number): PanelSide {
  const rect = el.getBoundingClientRect();
  const rightPanelLeft = window.innerWidth - panelWidth;
  const rightPanelWouldCoverSelection = rect.right > rightPanelLeft;
  const hasRoomOnLeft = rect.left > panelWidth;
  return rightPanelWouldCoverSelection && hasRoomOnLeft ? 'left' : 'right';
}

function readSelectedElementState(path: string, panelWidth: number): SelectedElementState {
  const el = document.querySelector<HTMLElement>(`[data-morph-path="${CSS.escape(path)}"]`);
  if (!el) return EMPTY_STATE;
  const computed = getComputedStyle(el);
  return {
    defaults: {
      color: cssColorToHex(computed.color, '#000000'),
      bg: resolveEffectiveBackgroundHex(el),
      fontSize: computed.fontSize,
    },
    disabledCapabilities: getDisabledCapabilities(el),
    panelSide: resolvePanelSide(el, panelWidth),
  };
}

interface PropertyPanelProps {
  onClose: () => void;
  suggestions: string[];
  suggestionsRefreshing: boolean;
}

export function PropertyPanel({
  onClose,
  suggestions,
  suggestionsRefreshing,
}: PropertyPanelProps) {
  const { selectedPath, config, dispatch } = useMorphContext();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [elementState, setElementState] = useState<SelectedElementState>(EMPTY_STATE);
  const { width, onResizePointerDown } = useResizablePanel();

  const override = selectedPath ? config[selectedPath] ?? {} : {};
  const { defaults, disabledCapabilities, panelSide } = elementState;
  const canChangeVisibility = isCapabilityEnabled(disabledCapabilities, 'visibility');
  const canChangeTextColor = isCapabilityEnabled(disabledCapabilities, 'textColor');
  const canChangeBackground = isCapabilityEnabled(disabledCapabilities, 'background');
  const canResize = isCapabilityEnabled(disabledCapabilities, 'resize');
  const hasManualControls = canChangeVisibility ||
    canChangeTextColor ||
    canChangeBackground ||
    canResize;

  useEffect(() => {
    if (!selectedPath) {
      setActiveTab('chat');
      setElementState(EMPTY_STATE);
      return;
    }

    const updateSelectedElementState = () => {
      setElementState(readSelectedElementState(selectedPath, width));
    };

    updateSelectedElementState();
    window.addEventListener('resize', updateSelectedElementState);
    window.addEventListener('scroll', updateSelectedElementState, true);

    return () => {
      window.removeEventListener('resize', updateSelectedElementState);
      window.removeEventListener('scroll', updateSelectedElementState, true);
    };
  }, [selectedPath, width]);

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

  return (
    <div
      data-morph-editor
      className={`morph-editor-panel morph-editor-panel--${panelSide}`}
      style={{ width: `${width}px` }}
    >
      <div
        className="morph-editor-panel__resize"
        onPointerDown={onResizePointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
      />

      <header className="morph-editor-panel__header">
        <div className="morph-editor-panel__brand">
          <div className="morph-editor-panel__brand-icon" aria-hidden>
            <SparklesIcon />
          </div>
          <div>
            <h2 className="morph-editor-panel__title">Assistant</h2>
            <p className="morph-editor-panel__subtitle">Layout & styling help</p>
          </div>
        </div>
        <button
          type="button"
          className="morph-editor-panel__close"
          onClick={onClose}
          aria-label="Close assistant panel"
          title="Close assistant"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="morph-editor-panel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'chat'}
          className={`morph-editor-panel__tab${activeTab === 'chat' ? ' morph-editor-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'manual'}
          className={`morph-editor-panel__tab${activeTab === 'manual' ? ' morph-editor-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('manual')}
          disabled={!selectedPath}
          title={!selectedPath ? 'Select an element on the page' : undefined}
        >
          Manual
        </button>
      </div>

      <div className="morph-editor-panel__body morph-editor-panel__body--flex">
        {activeTab === 'chat' ? (
          <AgentChat
            suggestions={suggestions}
            suggestionsRefreshing={suggestionsRefreshing}
          />
        ) : selectedPath ? (
          <div className="morph-editor-panel__manual">
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
                  type="button"
                  className="morph-editor-btn morph-editor-btn--danger morph-editor-btn--full"
                  onClick={resetOverride}
                >
                  Reset all overrides
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
