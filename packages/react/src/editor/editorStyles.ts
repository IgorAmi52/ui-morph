const EDITOR_STYLES = `
.morph-editor-selection {
  position: fixed;
  border: 2px solid #0891b2;
  border-radius: 4px;
  pointer-events: none;
  z-index: 10001;
  transition: top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease;
}

.morph-editor-panel {
  position: fixed;
  top: 0;
  width: 320px;
  height: 100vh;
  background: #fff;
  border-left: 1px solid #e2e8f0;
  z-index: 10002;
  overflow-y: auto;
  font-family: system-ui, -apple-system, sans-serif;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

.morph-editor-panel--right {
  right: 0;
}

.morph-editor-panel--left {
  left: 0;
  border-left: none;
  border-right: 1px solid #e2e8f0;
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.08);
}

.morph-editor-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.morph-editor-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
  margin-right: 8px;
}

.morph-editor-panel__close {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  color: #64748b;
  line-height: 1;
}

.morph-editor-panel__close:hover {
  background: #f1f5f9;
}

.morph-editor-panel__tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
}

.morph-editor-panel__tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.morph-editor-panel__tab:hover {
  color: #475569;
}

.morph-editor-panel__tab:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.morph-editor-panel__tab--active {
  color: #0891b2;
  border-bottom-color: #0891b2;
}

.morph-editor-panel__body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.morph-editor-control {
  margin-bottom: 16px;
}

.morph-editor-control__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.morph-editor-control__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.morph-editor-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: #1e293b;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}

.morph-editor-input:focus {
  border-color: #0891b2;
  box-shadow: 0 0 0 2px rgba(8, 145, 178, 0.15);
}

.morph-editor-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: #1e293b;
  background: #fff;
  outline: none;
  resize: vertical;
  min-height: 60px;
  transition: border-color 0.15s;
}

.morph-editor-textarea:focus {
  border-color: #0891b2;
  box-shadow: 0 0 0 2px rgba(8, 145, 178, 0.15);
}

.morph-editor-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: #fff;
  color: #475569;
  transition: background 0.15s, border-color 0.15s;
}

.morph-editor-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.morph-editor-btn--primary {
  background: #0891b2;
  color: #fff;
  border-color: #0891b2;
}

.morph-editor-btn--primary:hover {
  background: #0e7490;
  border-color: #0e7490;
}

.morph-editor-btn--danger {
  color: #dc2626;
  border-color: #fecaca;
}

.morph-editor-btn--danger:hover {
  background: #fef2f2;
}

.morph-editor-btn--full {
  width: 100%;
}

.morph-editor-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.morph-editor-toggle__switch {
  position: relative;
  width: 36px;
  height: 20px;
  background: #cbd5e1;
  border-radius: 10px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.morph-editor-toggle__switch--on {
  background: #0891b2;
}

.morph-editor-toggle__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.morph-editor-toggle__switch--on .morph-editor-toggle__knob {
  transform: translateX(16px);
}

.morph-editor-toggle__text {
  font-size: 13px;
  color: #475569;
}

.morph-editor-color {
  display: flex;
  align-items: center;
  gap: 8px;
}

.morph-editor-color__swatch {
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  background: none;
}

.morph-editor-color__swatch::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.morph-editor-color__swatch::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

.morph-editor-hidden-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  z-index: 10001;
  pointer-events: none;
  font-family: system-ui, sans-serif;
}

[data-morph-path] {
  cursor: pointer;
  transition: outline 0.1s;
  touch-action: none;
}

[data-morph-path]:hover {
  outline: 1px dashed #94a3b8;
  outline-offset: 2px;
}

.morph-editor-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 10003;
  font-family: system-ui, -apple-system, sans-serif;
}

.morph-editor-separator {
  border-top: 1px solid #e2e8f0;
  margin: 8px 0 16px;
}

.morph-editor-empty {
  font-size: 13px;
  line-height: 1.45;
  color: #64748b;
  padding: 10px 0;
}

.morph-editor-drag-handle {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: grab;
  z-index: 10000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: background 0.15s, box-shadow 0.15s, border-color 0.15s;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
}

.morph-editor-drag-handle:hover {
  background: #f0f9ff;
  border-color: #0891b2;
  box-shadow: 0 1px 4px rgba(8, 145, 178, 0.25);
}

.morph-editor-drag-handle:active {
  cursor: grabbing;
}

.morph-editor-drag-handle svg {
  width: 12px;
  height: 12px;
  color: #94a3b8;
}

.morph-editor-drag-handle:hover svg {
  color: #0891b2;
}

.morph-editor-drop-indicator {
  background: #0891b2;
  z-index: 10001;
  pointer-events: none;
  border-radius: 1px;
  box-shadow: 0 0 4px rgba(8, 145, 178, 0.4);
}

.morph-editor-drop-indicator::before,
.morph-editor-drop-indicator::after {
  content: '';
  position: absolute;
  top: -3px;
  width: 8px;
  height: 8px;
  background: #0891b2;
  border-radius: 50%;
}

.morph-editor-drop-indicator::before {
  left: -4px;
}

.morph-editor-drop-indicator::after {
  right: -4px;
}

.morph-editor-drop-indicator--x::before,
.morph-editor-drop-indicator--x::after {
  left: -3px;
  right: auto;
}

.morph-editor-drop-indicator--x::before {
  top: -4px;
}

.morph-editor-drop-indicator--x::after {
  top: auto;
  bottom: -4px;
}

.morph-editor-drag-overlay {
  opacity: 0.7;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  z-index: 10004;
  overflow: hidden;
}

.morph-editor-dragging [data-morph-path]:hover {
  outline: none;
}

.morph-editor-dragging [data-morph-path] {
  cursor: grabbing;
  user-select: none;
}

.morph-editor-resize-handle {
  position: absolute;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 3px;
  background: #0891b2;
  box-shadow: 0 1px 4px rgba(8, 145, 178, 0.35);
  cursor: nwse-resize;
  pointer-events: auto;
  touch-action: none;
}

.morph-editor-resize-handle:hover {
  background: #0e7490;
}

.morph-editor-resize-handle--n,
.morph-editor-resize-handle--s {
  left: 50%;
  width: 36px;
  height: 10px;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.morph-editor-resize-handle--n {
  top: -6px;
}

.morph-editor-resize-handle--s {
  bottom: -6px;
}

.morph-editor-resize-handle--e,
.morph-editor-resize-handle--w {
  top: 50%;
  width: 10px;
  height: 36px;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.morph-editor-resize-handle--e {
  right: -6px;
}

.morph-editor-resize-handle--w {
  left: -6px;
}

.morph-editor-resize-handle--ne,
.morph-editor-resize-handle--nw,
.morph-editor-resize-handle--se,
.morph-editor-resize-handle--sw {
  width: 12px;
  height: 12px;
}

.morph-editor-resize-handle--ne {
  top: -7px;
  right: -7px;
  cursor: nesw-resize;
}

.morph-editor-resize-handle--nw {
  top: -7px;
  left: -7px;
  cursor: nwse-resize;
}

.morph-editor-resize-handle--se {
  right: -7px;
  bottom: -7px;
  cursor: nwse-resize;
}

.morph-editor-resize-handle--sw {
  bottom: -7px;
  left: -7px;
  cursor: nesw-resize;
}
`;

let injected = false;

export function injectEditorStyles(): void {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-morph-editor', 'true');
  style.textContent = EDITOR_STYLES;
  document.head.appendChild(style);
  injected = true;
}

export function removeEditorStyles(): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector('style[data-morph-editor]');
  if (el) el.remove();
  injected = false;
}
