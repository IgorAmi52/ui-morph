import type { GeneratedPageDefinition, GeneratedPageItem } from '../types';

function itemValue(item: GeneratedPageItem): string {
  return item.value ?? item.text ?? '';
}

export function GeneratedPageView({ definition }: { definition: GeneratedPageDefinition }) {
  return (
    <section
      style={{
        minHeight: '100%',
        padding: '28px',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>{definition.title}</h1>
        {definition.description && (
          <p style={{ margin: '8px 0 0', color: '#475569', maxWidth: 760 }}>
            {definition.description}
          </p>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {definition.sections.map((section) => (
          <article
            key={section.id}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>{section.title}</h2>
            {section.visualHtml && (
              <div
                style={{
                  width: '100%',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  marginBottom: 12,
                }}
                dangerouslySetInnerHTML={{ __html: section.visualHtml }}
              />
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {section.items.map((item) => (
                <div key={item.id} style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 650 }}>{item.label}</div>
                  {item.kind === 'metric' ? (
                    <div style={{ marginTop: 2, fontSize: 24, fontWeight: 750 }}>{itemValue(item)}</div>
                  ) : (
                    <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 14, lineHeight: 1.45 }}>
                      {itemValue(item)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
