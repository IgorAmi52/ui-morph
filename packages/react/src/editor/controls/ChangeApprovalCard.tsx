import type { ConfigChangeSummary } from '../../types';
import { focusChangePath, setChangeHighlights } from '../changeHighlights';

interface ChangeApprovalCardProps {
  changes: ConfigChangeSummary[];
  allPaths: string[];
  onAccept: () => void;
  onDiscard: () => void;
  busy?: boolean;
}

export function ChangeApprovalCard({
  changes,
  allPaths,
  onAccept,
  onDiscard,
  busy = false,
}: ChangeApprovalCardProps) {
  return (
    <div className="morph-approval" data-morph-editor>
      <div className="morph-approval__header">
        <svg className="morph-approval__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Review on the page</span>
      </div>
      <ul className="morph-approval__list">
        {changes.map((c) => (
          <li key={c.path}>
            <button
              type="button"
              className="morph-approval__item"
              onMouseEnter={() => setChangeHighlights([c.path])}
              onMouseLeave={() => setChangeHighlights(allPaths)}
              onClick={() => focusChangePath(c.path)}
            >
              <span className="morph-approval__dot" aria-hidden />
              {c.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="morph-approval__actions">
        <button
          type="button"
          className="morph-editor-btn morph-editor-btn--sm morph-editor-btn--ghost"
          onClick={onDiscard}
          disabled={busy}
        >
          Discard
        </button>
        <button
          type="button"
          className="morph-editor-btn morph-editor-btn--sm morph-editor-btn--primary"
          onClick={onAccept}
          disabled={busy}
        >
          {busy ? 'Saving…' : 'Accept changes'}
        </button>
      </div>
    </div>
  );
}
