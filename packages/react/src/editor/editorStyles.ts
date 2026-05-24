const EDITOR_STYLES = `
.morph-editor-selection {
  position: fixed;
  border: 2px solid #0891b2;
  border-radius: 4px;
  pointer-events: none;
  z-index: 10001;
  transition: top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease;
}

.morph-editor-selection__label {
  position: absolute;
  top: -24px;
  left: -2px;
  background: #0891b2;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 3px 3px 0 0;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.morph-editor-panel {
  --morph-panel-bg: #f8fafc;
  --morph-panel-surface: #ffffff;
  --morph-panel-border: #e2e8f0;
  --morph-panel-text: #0f172a;
  --morph-panel-muted: #64748b;
  --morph-panel-accent: #0891b2;
  --morph-panel-accent-soft: #ecfeff;
  position: fixed;
  top: 0;
  right: 0;
  min-width: 300px;
  max-width: 560px;
  height: 100vh;
  background: var(--morph-panel-bg);
  border-left: 1px solid var(--morph-panel-border);
  z-index: 10002;
  overflow: hidden;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-feature-settings: 'kern' 1, 'liga' 1;
  -webkit-font-smoothing: antialiased;
  box-shadow: -8px 0 32px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
}

.morph-editor-panel--right {
  right: 0;
}

.morph-editor-panel--left {
  left: 0;
  border-left: none;
  border-right: 1px solid var(--morph-panel-border);
  box-shadow: 8px 0 32px rgba(15, 23, 42, 0.06);
}

.morph-editor-panel--left .morph-editor-panel__resize {
  left: auto;
  right: 0;
}

.morph-editor-panel__resize {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 2;
  touch-action: none;
}

.morph-editor-panel__resize::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 48px;
  border-radius: 2px;
  background: transparent;
  transition: background 0.15s;
}

.morph-editor-panel__resize:hover::after,
.morph-editor-panel__resize:active::after {
  background: var(--morph-panel-accent);
}

.morph-editor-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px;
  background: var(--morph-panel-surface);
  border-bottom: 1px solid var(--morph-panel-border);
  flex-shrink: 0;
}

.morph-editor-panel__brand {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}

.morph-editor-panel__brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
  box-shadow: 0 2px 8px rgba(8, 145, 178, 0.25);
}

.morph-editor-sparkles {
  display: block;
  flex-shrink: 0;
}

.morph-editor-panel__brand-icon .morph-editor-sparkles {
  width: 24px;
  height: 24px;
}

.morph-editor-panel__brand-icon svg {
  width: 24px;
  height: 24px;
}

.morph-editor-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--morph-panel-text);
  line-height: 1.3;
}

.morph-editor-panel__subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--morph-panel-muted);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.morph-editor-panel__close {
  background: var(--morph-panel-bg);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 6px;
  color: var(--morph-panel-muted);
  line-height: 0;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.morph-editor-panel__close:hover {
  background: #e2e8f0;
  color: var(--morph-panel-text);
}

.morph-editor-panel__tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: var(--morph-panel-surface);
  border-bottom: 1px solid var(--morph-panel-border);
  flex-shrink: 0;
}

.morph-editor-panel__tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--morph-panel-muted);
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}

.morph-editor-panel__tab:hover:not(:disabled) {
  background: var(--morph-panel-bg);
  color: var(--morph-panel-text);
}

.morph-editor-panel__tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.morph-editor-panel__tab--active {
  background: var(--morph-panel-accent-soft);
  color: var(--morph-panel-accent);
}

.morph-editor-panel__body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.morph-editor-panel__body--flex {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.morph-editor-panel__manual {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.morph-editor-agent-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  background: var(--morph-panel-bg);
}

.morph-editor-agent-chat__messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 14px 8px;
  min-height: 0;
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.morph-editor-agent-chat__messages::-webkit-scrollbar {
  width: 8px;
}

.morph-editor-agent-chat__messages::-webkit-scrollbar-track {
  background: transparent;
  margin: 4px 0;
}

.morph-editor-agent-chat__messages::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.morph-editor-agent-chat__messages::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.morph-editor-agent-chat__messages::-webkit-scrollbar-thumb:active {
  background: #0891b2;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.morph-editor-agent-chat__error {
  font-size: 12px;
  color: #b91c1c;
  padding: 8px 14px;
  margin: 0;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
  flex-shrink: 0;
}

.morph-editor-agent-chat__sticky {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  margin: 0;
  background: var(--morph-panel-surface);
  border-top: 1px solid var(--morph-panel-border);
  font-size: 12px;
  font-weight: 500;
  color: var(--morph-panel-text);
  flex-shrink: 0;
  box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.04);
}

.morph-editor-agent-chat__sticky-label {
  color: var(--morph-panel-muted);
}

.morph-editor-agent-chat__sticky-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* —— Chat messages —— */
.morph-chat-msg {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  animation: morph-chat-in 0.35s ease both;
}

@keyframes morph-chat-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.morph-chat-msg--user {
  flex-direction: row-reverse;
}

.morph-chat-msg--user .morph-chat-msg__content {
  align-items: flex-end;
}

.morph-chat-msg--user .morph-chat-msg__meta {
  flex-direction: row-reverse;
}

.morph-chat-msg__avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0891b2, #06b6d4);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
  margin-top: 2px;
}

.morph-chat-msg__avatar .morph-editor-sparkles {
  width: 22px;
  height: 22px;
}

.morph-chat-msg__avatar svg {
  width: 22px;
  height: 22px;
}

.morph-chat-msg__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  max-width: calc(100% - 38px);
}

.morph-chat-msg__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.morph-chat-msg__author {
  font-size: 11px;
  font-weight: 600;
  color: var(--morph-panel-muted);
  letter-spacing: 0.02em;
}

.morph-chat-msg__time {
  font-size: 10px;
  color: #94a3b8;
}

.morph-chat-msg__bubble {
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 100%;
}

.morph-chat-msg--assistant .morph-chat-msg__bubble {
  background: var(--morph-panel-surface);
  border: 1px solid var(--morph-panel-border);
  border-top-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.morph-chat-msg--user .morph-chat-msg__bubble {
  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
  border-top-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(8, 145, 178, 0.2);
}

.morph-chat-msg__text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  letter-spacing: -0.01em;
  word-break: break-word;
  white-space: pre-wrap;
}

.morph-chat-msg__markdown {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  letter-spacing: -0.01em;
  word-break: break-word;
  color: inherit;
}

.morph-chat-msg__markdown p {
  margin: 0 0 0.65em;
}

.morph-chat-msg__markdown p:last-child {
  margin-bottom: 0;
}

.morph-chat-msg__markdown ul,
.morph-chat-msg__markdown ol {
  margin: 0.35em 0 0.65em;
  padding-left: 1.35em;
}

.morph-chat-msg__markdown li {
  margin-bottom: 0.35em;
}

.morph-chat-msg__markdown li:last-child {
  margin-bottom: 0;
}

.morph-chat-msg__markdown strong {
  font-weight: 600;
}

.morph-chat-msg__markdown em {
  font-style: italic;
}

.morph-chat-msg__markdown code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.92em;
  padding: 0.12em 0.35em;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.06);
}

.morph-chat-msg__markdown a {
  color: #0891b2;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.morph-chat-msg__markdown a:hover {
  color: #0e7490;
}

.morph-chat-msg--user .morph-chat-msg__text {
  color: #f0fdfa;
}

.morph-chat-msg--assistant .morph-chat-msg__text,
.morph-chat-msg--assistant .morph-chat-msg__markdown {
  color: var(--morph-panel-text);
}

.morph-chat-msg__status {
  font-size: 11px;
  color: var(--morph-panel-muted);
  margin: 0;
  padding-left: 4px;
}

.morph-chat-msg__status--ok {
  color: #059669;
}

.morph-chat-msg__bubble--typing {
  padding: 12px 16px;
}

.morph-chat-typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 8px;
}

.morph-chat-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  animation: morph-typing 1.2s ease-in-out infinite;
}

.morph-chat-typing span:nth-child(2) { animation-delay: 0.15s; }
.morph-chat-typing span:nth-child(3) { animation-delay: 0.3s; }

@keyframes morph-typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* —— Empty state —— */
.morph-chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 12px 16px;
  animation: morph-chat-in 0.4s ease;
}

.morph-chat-empty--muted {
  padding: 32px 16px;
}

.morph-chat-empty__icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--morph-panel-surface);
  border: 1px solid var(--morph-panel-border);
  color: var(--morph-panel-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  margin-bottom: 14px;
}

.morph-chat-empty__icon .morph-editor-sparkles {
  width: 32px;
  height: 32px;
}

.morph-chat-empty__icon svg {
  width: 32px;
  height: 32px;
}

.morph-chat-empty__title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--morph-panel-text);
}

.morph-chat-empty__desc {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--morph-panel-muted);
  max-width: 28ch;
}

.morph-chat-empty__chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.morph-chat-empty__chip {
  padding: 10px 14px;
  border: 1px solid var(--morph-panel-border);
  border-radius: 10px;
  background: var(--morph-panel-surface);
  font-size: 13px;
  color: var(--morph-panel-text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.morph-chat-empty__chip:hover:not(:disabled) {
  border-color: #99f6e4;
  background: var(--morph-panel-accent-soft);
  box-shadow: 0 2px 8px rgba(8, 145, 178, 0.08);
}

.morph-chat-empty__chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.morph-chat-empty__chips--refreshing .morph-chat-empty__chip {
  opacity: 0.85;
}

.morph-chat-empty__chips--refreshing::after {
  content: 'Updating suggestions…';
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
}

.morph-chat-empty__chip--loading {
  height: 42px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: morph-chip-shimmer 1.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes morph-chip-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* —— Composer —— */
.morph-chat-composer {
  padding: 12px 14px 14px;
  background: var(--morph-panel-surface);
  border-top: 1px solid var(--morph-panel-border);
  flex-shrink: 0;
}

.morph-chat-composer__selection {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--morph-panel-accent-soft);
  border: 1px solid #99f6e4;
  font-size: 12px;
  min-width: 0;
}

.morph-chat-composer__selection-label {
  font-weight: 600;
  color: var(--morph-panel-accent);
  flex-shrink: 0;
}

.morph-chat-composer__selection-value {
  color: var(--morph-panel-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.morph-chat-composer--disabled {
  opacity: 0.85;
}

.morph-chat-composer__box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 14px;
  background: var(--morph-panel-bg);
  border: 1px solid var(--morph-panel-border);
  border-radius: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.morph-chat-composer__box:focus-within {
  border-color: #67e8f9;
  box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.12);
}

.morph-chat-composer__input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13.5px;
  line-height: 1.4;
  color: var(--morph-panel-text);
  resize: none;
  outline: none;
  font-family: inherit;
  max-height: 128px;
  min-height: 22px;
  margin: 0;
  padding: 6px 0;
  vertical-align: middle;
}

.morph-chat-composer__input::placeholder {
  color: #94a3b8;
}

.morph-chat-composer__send {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: var(--morph-panel-accent);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, transform 0.1s, opacity 0.15s;
}

.morph-chat-composer__send svg {
  width: 16px;
  height: 16px;
}

.morph-chat-composer__send:hover:not(:disabled) {
  background: #0e7490;
}

.morph-chat-composer__send:active:not(:disabled) {
  transform: scale(0.96);
}

.morph-chat-composer__send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.morph-chat-composer__hint {
  margin: 8px 0 0;
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
}

.morph-chat-msg--streaming .morph-chat-msg__bubble {
  opacity: 0.92;
}

.morph-chat-msg__proposal-summary {
  margin-top: 6px;
}

.morph-chat-msg__change-list {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--morph-panel-muted);
}

/* —— Approval card —— */
.morph-approval {
  margin-top: 4px;
  padding: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
}

.morph-approval__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
}

.morph-approval__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.morph-approval__list {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.morph-approval__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  line-height: 1.45;
  color: #78350f;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.morph-approval__item:hover {
  background: rgba(245, 158, 11, 0.12);
}

.morph-approval__list li {
  margin-bottom: 2px;
}

.morph-approval__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

.morph-approval__item .morph-approval__dot {
  margin-top: 7px;
}

.morph-editor-change-highlight {
  outline: 2px solid #f59e0b !important;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15) !important;
  transition: outline 0.2s, box-shadow 0.2s;
}

.morph-editor-change-pulse {
  animation: morph-change-pulse 1.2s ease;
}

@keyframes morph-change-pulse {
  0% {
    outline-color: #f59e0b;
    box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.35) !important;
  }
  100% {
    outline-color: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15) !important;
  }
}

.morph-approval__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.morph-editor-btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--morph-panel-muted);
}

.morph-editor-btn--ghost:hover {
  background: var(--morph-panel-bg);
  border-color: var(--morph-panel-border);
  color: var(--morph-panel-text);
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

.morph-editor-btn--sm {
  padding: 6px 12px;
  font-size: 12px;
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
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 10003;
  font-family: system-ui, -apple-system, sans-serif;
}

.morph-editor-toolbar__history {
  display: flex;
  gap: 4px;
  padding-right: 12px;
  border-right: 1px solid #e2e8f0;
}

.morph-editor-toolbar__actions {
  display: flex;
  gap: 8px;
}

.morph-editor-btn--icon {
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.morph-editor-btn--icon svg {
  width: 18px;
  height: 18px;
}

.morph-editor-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.morph-editor-split-handle {
  position: fixed;
  width: 10px;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 3px;
  background: #0891b2;
  box-shadow: 0 1px 4px rgba(8, 145, 178, 0.35);
  transform: translateX(-50%);
  cursor: col-resize;
  pointer-events: auto;
  touch-action: none;
  z-index: 10002;
}

.morph-editor-split-handle:hover {
  background: #0e7490;
}

.morph-editor-separator {
  border-top: 1px solid #e2e8f0;
  margin: 8px 0 16px;
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
  height: 2px;
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

.morph-editor-drag-overlay {
  opacity: 0.7;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
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
