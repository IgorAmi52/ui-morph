import { useMemo, useState } from 'react';
import type {
  GeneratedPageDefinition,
  GeneratedPageSourceSnapshot,
  GeneratedPageSourceSummary,
  LayoutNode,
} from '../types';
import { createPage, generatePage } from '../config/pageClient';

interface CreatePageModalProps {
  apiUrl: string;
  userId: string;
  viewId: string;
  sessionId: string;
  routeId: string;
  sources: GeneratedPageSourceSnapshot[];
  onClose: () => void;
  onCreated: (pageId: string) => void;
  onError?: (error: Error) => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  background: 'rgba(15,23,42,0.42)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  backdropFilter: 'blur(3px)',
};

const modalStyle: React.CSSProperties = {
  width: 'min(900px, 100%)',
  maxHeight: 'min(760px, calc(100vh - 40px))',
  overflow: 'hidden',
  background: '#fff',
  color: '#0f172a',
  borderRadius: 8,
  boxShadow: '0 24px 70px rgba(15,23,42,0.28)',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const headerStyle: React.CSSProperties = {
  padding: '20px 22px 16px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
};

const bodyStyle: React.CSSProperties = {
  padding: 22,
  overflow: 'auto',
  display: 'grid',
  gap: 18,
};

const footerStyle: React.CSSProperties = {
  padding: '14px 22px',
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  background: '#f8fafc',
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#334155',
  padding: '8px 12px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#1d4ed8',
  border: '1px solid #1d4ed8',
  color: '#fff',
};

const mutedButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#f8fafc',
};

const fieldStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: 12,
  font: 'inherit',
  fontWeight: 400,
  outline: 'none',
  boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.04)',
};

const previewVisualStyle: React.CSSProperties = {
  marginTop: 10,
  height: 150,
  overflow: 'hidden',
  border: '1px solid #f1f5f9',
  borderRadius: 8,
  background: '#fff',
  position: 'relative',
};

const previewVisualInnerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  transform: 'scale(0.72)',
  transformOrigin: 'top left',
  width: '138%',
  height: '138%',
  overflow: 'hidden',
  pointerEvents: 'none',
};

const stepperStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
  padding: '10px 12px',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
};

function stepStyle(active: boolean, complete = false): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1e3a8a' : '#475569',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 650,
    opacity: complete || active ? 1 : 0.74,
  };
}

function stepNumberStyle(active: boolean, complete = false): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: active || complete ? '#1d4ed8' : '#e2e8f0',
    color: active || complete ? '#fff' : '#475569',
    fontSize: 12,
    fontWeight: 750,
  };
}

function cardStyle(active = false): React.CSSProperties {
  return {
    border: `1px solid ${active ? '#93c5fd' : '#e2e8f0'}`,
    background: active ? '#f8fbff' : '#fff',
    borderRadius: 8,
    padding: 14,
    boxShadow: active ? '0 1px 4px rgba(37,99,235,0.12)' : '0 1px 2px rgba(15,23,42,0.04)',
  };
}

function sourceSummary(source: GeneratedPageSourceSnapshot): GeneratedPageSourceSummary {
  return {
    viewId: source.viewId,
    routeId: source.routeId,
    path: source.path,
    label: source.label,
    capturedAt: source.capturedAt,
  };
}

function firstText(nodes: LayoutNode[]): string | null {
  for (const node of nodes) {
    if (node.text?.trim()) return node.text.trim();
    const childText = firstText(node.children);
    if (childText) return childText;
  }
  return null;
}

export function CreatePageModal({
  apiUrl,
  userId,
  viewId,
  sessionId,
  routeId,
  sources,
  onClose,
  onCreated,
  onError,
}: CreatePageModalProps) {
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(sources.slice(0, 1).map((source) => source.routeId)),
  );
  const [definition, setDefinition] = useState<GeneratedPageDefinition | null>(null);
  const [busy, setBusy] = useState<'generate' | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSources = useMemo(
    () => sources.filter((source) => selected.has(source.routeId)),
    [selected, sources],
  );
  const effectivePrompt = prompt.trim() || 'Create a combined dashboard from the selected pages';
  const step: 'setup' | 'preview' = definition ? 'preview' : 'setup';

  const toggleSource = (route: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(route)) next.delete(route);
      else next.add(route);
      return next;
    });
  };

  const runGenerate = async () => {
    const message = effectivePrompt;
    if (selectedSources.length === 0 || busy) return;
    setBusy('generate');
    setError(null);
    try {
      const result = await generatePage(apiUrl, {
        userId,
        viewId,
        sessionId,
        routeId,
        prompt: message,
        sources: selectedSources,
      });
      setDefinition(result.definition);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message);
      onError?.(e);
    } finally {
      setBusy(null);
    }
  };

  const runCreate = async () => {
    if (!definition || busy) return;
    setBusy('create');
    setError(null);
    try {
      const page = await createPage(apiUrl, {
        userId,
        sessionId,
        routeId,
        prompt: effectivePrompt,
        sources: selectedSources.map(sourceSummary),
        definition,
      });
      onCreated(page.pageId);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message);
      onError?.(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-morph-editor style={overlayStyle} role="dialog" aria-modal="true" aria-label="Create a page">
      <div style={modalStyle}>
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              aria-hidden
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                background: '#dbeafe',
                color: '#1d4ed8',
                fontSize: 22,
                fontWeight: 650,
              }}
            >
              +
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, letterSpacing: 0 }}>Create a page</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                Generate a composed dashboard from captured app pages.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={mutedButtonStyle} aria-label="Close create page">
            Close
          </button>
        </header>

        <div style={stepperStyle} aria-label="Create page steps">
          <div style={stepStyle(step === 'setup', Boolean(definition))}>
            <span style={stepNumberStyle(step === 'setup', Boolean(definition))}>1</span>
            Configure sources
          </div>
          <div style={stepStyle(step === 'preview')}>
            <span style={stepNumberStyle(step === 'preview')}>2</span>
            Review and create
          </div>
        </div>

        <div style={bodyStyle}>
          {step === 'setup' ? (
            <>
              <div style={cardStyle(true)}>
                <label style={{ display: 'grid', gap: 8, fontWeight: 700, fontSize: 13 }}>
                  What should this page help you do?
                  <textarea
                    value={prompt}
                    onChange={(event) => {
                      setPrompt(event.target.value);
                      setDefinition(null);
                    }}
                    placeholder="Example: Create an executive overview with claims, policy activity, and support risks."
                    rows={4}
                    style={{
                      ...fieldStyle,
                      resize: 'vertical',
                      minHeight: 112,
                    }}
                  />
                </label>
                <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
                  Leave this blank to create a balanced dashboard from the selected pages.
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 750, fontSize: 13 }}>Source pages</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                      {selectedSources.length} selected from {sources.length} captured page
                      {sources.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {sources.map((source) => {
                    const checked = selected.has(source.routeId);
                    const visualCount = source.visualFragments?.length ?? 0;
                    const sample = firstText(source.snapshot.nodes);
                    return (
                      <label
                        key={`${source.routeId}:${source.path}`}
                        style={{
                          ...cardStyle(checked),
                          display: 'grid',
                          gap: 10,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <span style={{ display: 'grid', gap: 3 }}>
                            <span style={{ fontWeight: 750, fontSize: 13 }}>{source.label}</span>
                            <span style={{ color: '#64748b', fontSize: 12 }}>{source.path}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSource(source.routeId)}
                          />
                        </span>
                        <span style={{ color: '#475569', fontSize: 12 }}>
                          {source.snapshot.nodeCount} nodes
                          {visualCount > 0 ? ` · ${visualCount} visual${visualCount === 1 ? '' : 's'}` : ''}
                        </span>
                        {sample && (
                          <span style={{ color: '#64748b', fontSize: 12, lineHeight: 1.35 }}>
                            {sample}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          ) : definition ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={cardStyle(true)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 19 }}>{definition.title}</h3>
                    {definition.description && (
                      <p style={{ margin: '7px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.45 }}>
                        {definition.description}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      borderRadius: 999,
                      padding: '4px 9px',
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Preview
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {definition.sections.map((section) => (
                  <div key={section.id} style={cardStyle()}>
                    <strong style={{ fontSize: 14 }}>{section.title}</strong>
                    {section.visualHtml && (
                      <div
                        style={previewVisualStyle}
                        aria-label={`${section.title} visual preview`}
                      >
                        <div
                          style={previewVisualInnerStyle}
                          dangerouslySetInnerHTML={{ __html: section.visualHtml }}
                        />
                      </div>
                    )}
                    <div style={{ marginTop: 9, color: '#475569', fontSize: 12, lineHeight: 1.45 }}>
                      {section.items.slice(0, 4).map((item) => item.text ?? item.value ?? item.label).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error && (
            <div
              style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 8, padding: 10, fontSize: 13 }}
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        <footer style={footerStyle}>
          <div style={{ color: '#64748b', fontSize: 12 }}>
            {step === 'setup'
              ? 'Step 1 of 2'
              : `${definition?.sections.length ?? 0} section${definition?.sections.length === 1 ? '' : 's'} ready`}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setDefinition(null)}
                disabled={busy !== null}
                style={mutedButtonStyle}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => void runGenerate()}
              disabled={selectedSources.length === 0 || busy !== null}
              style={step === 'setup' ? primaryButtonStyle : buttonStyle}
            >
              {busy === 'generate' ? 'Generating...' : step === 'preview' ? 'Regenerate' : 'Generate'}
            </button>
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => void runCreate()}
                disabled={!definition || busy !== null}
                style={primaryButtonStyle}
              >
                {busy === 'create' ? 'Creating...' : 'Create page'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
