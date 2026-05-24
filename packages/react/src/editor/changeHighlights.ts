export const CHANGE_HIGHLIGHT_CLASS = 'morph-editor-change-highlight';
export const CHANGE_PULSE_CLASS = 'morph-editor-change-pulse';

export function setChangeHighlights(paths: string[]): void {
  document.querySelectorAll(`.${CHANGE_HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(CHANGE_HIGHLIGHT_CLASS);
  });
  for (const path of paths) {
    const el = document.querySelector<HTMLElement>(
      `[data-morph-path="${CSS.escape(path)}"]`,
    );
    el?.classList.add(CHANGE_HIGHLIGHT_CLASS);
  }
}

export function clearChangeHighlights(): void {
  document.querySelectorAll(`.${CHANGE_HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(CHANGE_HIGHLIGHT_CLASS);
  });
}

export function focusChangePath(path: string): void {
  const el = document.querySelector<HTMLElement>(
    `[data-morph-path="${CSS.escape(path)}"]`,
  );
  if (!el) return;

  document.querySelectorAll(`.${CHANGE_PULSE_CLASS}`).forEach((node) => {
    node.classList.remove(CHANGE_PULSE_CLASS);
  });

  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  el.classList.add(CHANGE_PULSE_CLASS);
  window.setTimeout(() => el.classList.remove(CHANGE_PULSE_CLASS), 1200);
}
