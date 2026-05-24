import { useCallback, useState } from 'react';
import { useMorphContext } from '../config/ConfigContext';
import { createShareLink } from '../config/shareClient';

export function SharePreviewButton() {
  const { config, userId, viewId, apiUrl } = useMorphContext();
  const [busy, setBusy] = useState(false);

  const handleShare = useCallback(async () => {
    if (!apiUrl || busy) return;

    setBusy(true);
    try {
      const { url } = await createShareLink(apiUrl, {
        userId,
        viewId,
        overrides: config,
      });

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }

      window.alert(`Preview link copied to clipboard:\n\n${url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create share link';
      window.alert(message);
    } finally {
      setBusy(false);
    }
  }, [apiUrl, busy, config, userId, viewId]);

  if (!apiUrl) return null;

  return (
    <button
      type="button"
      className="morph-editor-btn"
      onClick={() => void handleShare()}
      disabled={busy}
      aria-label="Copy read-only preview link"
      title="Copy read-only preview link"
    >
      {busy ? 'Sharing…' : 'Share preview'}
    </button>
  );
}
