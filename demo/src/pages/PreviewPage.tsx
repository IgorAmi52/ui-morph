import { useEffect, useState, type ComponentType } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Morph, fetchShareByToken } from '@ui-morph/react';
import type { MorphConfig } from '@ui-morph/react';
import Dashboard from './Dashboard';
import Policies from './Policies';
import Claims from './Claims';
import Customers from './Customers';
import Analytics from './Analytics';
import Agents from './Agents';
import Reports from './Reports';
import Settings from './Settings';
import Support from './Support';
import '../layouts/layout.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const VIEW_PAGES: Record<string, ComponentType> = {
  index: Dashboard,
  policies: Policies,
  claims: Claims,
  customers: Customers,
  analytics: Analytics,
  agents: Agents,
  reports: Reports,
  settings: Settings,
  support: Support,
};

type PreviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; userId: string; viewId: string; config: MorphConfig };

export default function PreviewPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<PreviewState>({ status: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'Missing preview token.' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    fetchShareByToken(API_URL, token)
      .then((data) => {
        if (!cancelled) {
          setState({
            status: 'ready',
            userId: data.userId,
            viewId: data.viewId,
            config: data.config,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load preview';
          setState({ status: 'error', message });
        }
      });

    return () => { cancelled = true; };
  }, [token]);

  if (state.status === 'loading') {
    return (
      <div className="preview-page preview-page--centered">
        <p>Loading preview…</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="preview-page preview-page--centered">
        <p>{state.message}</p>
      </div>
    );
  }

  const Page = VIEW_PAGES[state.viewId] ?? Dashboard;

  return (
    <Morph
      userId={state.userId}
      viewId={state.viewId}
      previewConfig={state.config}
      mode="view"
      editable={false}
    >
      <div className="layout layout--preview">
        <main className="layout__main">
          <Page />
        </main>
      </div>
    </Morph>
  );
}
