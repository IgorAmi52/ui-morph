import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { getPool } from './db/client.js';

const app = createApp();

describe('HTTP API', () => {
  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /config/:userId/:viewId', () => {
    it('returns empty object when no config exists', async () => {
      const res = await request(app)
        .get('/config/demo-user/dashboard')
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns saved overrides', async () => {
      const overrides = {
        'morph.div:0.h1:0': { style: { color: 'red', fontSize: '24px' } },
      };

      await request(app)
        .put('/config/demo-user/dashboard')
        .send({ overrides })
        .expect(200);

      const res = await request(app)
        .get('/config/demo-user/dashboard')
        .expect(200);

      expect(res.body).toEqual(overrides);
    });
  });

  describe('PUT /config/:userId/:viewId', () => {
    it('saves and returns validated overrides', async () => {
      const overrides = {
        'morph.div:0': { text: 'Welcome' },
      };

      const res = await request(app)
        .put('/config/demo-user/dashboard')
        .send({ overrides })
        .expect(200);

      expect(res.body).toEqual(overrides);
    });

    it('replaces the full config on subsequent saves', async () => {
      await request(app)
        .put('/config/demo-user/dashboard')
        .send({ overrides: { 'morph.div:0': { hidden: true } } })
        .expect(200);

      const res = await request(app)
        .put('/config/demo-user/dashboard')
        .send({ overrides: { 'morph.div:1': { text: 'Only this remains' } } })
        .expect(200);

      expect(res.body).toEqual({
        'morph.div:1': { text: 'Only this remains' },
      });

      const getRes = await request(app)
        .get('/config/demo-user/dashboard')
        .expect(200);

      expect(getRes.body).toEqual(res.body);
    });

    it('rejects requests without overrides', async () => {
      const res = await request(app)
        .put('/config/demo-user/dashboard')
        .send({})
        .expect(400);

      expect(res.body).toEqual({
        error: 'Request body must include an overrides object',
      });
    });

    it('rejects dangerous CSS values', async () => {
      const res = await request(app)
        .put('/config/demo-user/dashboard')
        .send({
          overrides: {
            'morph.div:0': { style: { backgroundColor: 'javascript:alert(1)' } },
          },
        })
        .expect(400);

      expect(res.body.error).toMatch(/disallowed content/);
    });

    it('isolates configs per user and view', async () => {
      await request(app)
        .put('/config/user-a/dashboard')
        .send({ overrides: { 'morph.div:0': { hidden: true } } })
        .expect(200);

      await request(app)
        .put('/config/user-b/dashboard')
        .send({ overrides: { 'morph.div:0': { text: 'User B' } } })
        .expect(200);

      const userA = await request(app).get('/config/user-a/dashboard').expect(200);
      const userB = await request(app).get('/config/user-b/dashboard').expect(200);

      expect(userA.body).toEqual({ 'morph.div:0': { hidden: true } });
      expect(userB.body).toEqual({ 'morph.div:0': { text: 'User B' } });
    });

    it('isolates configs per client session', async () => {
      await request(app)
        .put('/config/user-a/dashboard?sessionId=client-a')
        .send({ overrides: { 'morph.div:0': { hidden: true } } })
        .expect(200);

      await request(app)
        .put('/config/user-a/dashboard?sessionId=client-b')
        .send({ overrides: { 'morph.div:0': { text: 'Client B' } } })
        .expect(200);

      const clientA = await request(app)
        .get('/config/user-a/dashboard?sessionId=client-a')
        .expect(200);
      const clientB = await request(app)
        .get('/config/user-a/dashboard?sessionId=client-b')
        .expect(200);
      const defaultSession = await request(app)
        .get('/config/user-a/dashboard')
        .expect(200);

      expect(clientA.body).toEqual({ 'morph.div:0': { hidden: true } });
      expect(clientB.body).toEqual({ 'morph.div:0': { text: 'Client B' } });
      expect(defaultSession.body).toEqual({});
    });

    it('isolates configs per route within one client session', async () => {
      await request(app)
        .put('/config/user-a/shared-card?sessionId=client-a&routeId=claims')
        .send({ overrides: { 'morph.div:0': { hidden: true } } })
        .expect(200);

      await request(app)
        .put('/config/user-a/shared-card?sessionId=client-a&routeId=policies')
        .send({ overrides: { 'morph.div:0': { text: 'Policies copy' } } })
        .expect(200);

      const claims = await request(app)
        .get('/config/user-a/shared-card?sessionId=client-a&routeId=claims')
        .expect(200);
      const policies = await request(app)
        .get('/config/user-a/shared-card?sessionId=client-a&routeId=policies')
        .expect(200);

      expect(claims.body).toEqual({ 'morph.div:0': { hidden: true } });
      expect(policies.body).toEqual({ 'morph.div:0': { text: 'Policies copy' } });
    });
  });

  describe('shared dashboards', () => {
    it('creates and fetches a share without mutating normal config', async () => {
      const overrides = { 'morph.div:0': { text: 'Shared dashboard' } };

      const createRes = await request(app)
        .post('/shares')
        .send({
          userId: 'user-a',
          viewId: 'dashboard',
          sessionId: 'client-a',
          routeId: 'dashboard',
          sourcePath: '/dashboard',
          overrides,
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        userId: 'user-a',
        viewId: 'dashboard',
        sessionId: 'client-a',
        routeId: 'dashboard',
        sourcePath: '/dashboard',
        version: 1,
      });
      expect(typeof createRes.body.shareId).toBe('string');

      const configRes = await request(app)
        .get(`/shares/${createRes.body.shareId}/config`)
        .expect(200);
      expect(configRes.body).toEqual(overrides);

      const normalConfig = await request(app)
        .get('/config/user-a/dashboard?sessionId=client-a&routeId=dashboard')
        .expect(200);
      expect(normalConfig.body).toEqual({});
    });

    it('saves shared config, increments version, and logs actions', async () => {
      const createRes = await request(app)
        .post('/shares')
        .send({
          userId: 'user-a',
          viewId: 'dashboard',
          sessionId: 'client-a',
          routeId: 'dashboard',
          overrides: { 'morph.div:0': { hidden: true } },
        })
        .expect(201);

      const shareId = createRes.body.shareId as string;
      const next = { 'morph.div:1': { text: 'Edited by B' } };

      await request(app)
        .put(`/shares/${shareId}/config?sessionId=client-b`)
        .send({ overrides: next })
        .expect(200)
        .expect(next);

      const meta = await request(app).get(`/shares/${shareId}`).expect(200);
      expect(meta.body.version).toBe(2);

      const actions = await getPool().query<{
        actor_session_id: string;
        action: string;
        version: number;
      }>(
        `SELECT actor_session_id, action, version
         FROM morph_share_actions
         WHERE share_id = $1
         ORDER BY id`,
        [shareId],
      );

      expect(actions.rows).toEqual([
        { actor_session_id: 'client-a', action: 'create', version: 1 },
        { actor_session_id: 'client-b', action: 'save', version: 2 },
      ]);
    });

    it('returns 404 for unknown shares', async () => {
      await request(app).get('/shares/missing-share').expect(404);
      await request(app).get('/shares/missing-share/config').expect(404);
      await request(app)
        .put('/shares/missing-share/config')
        .send({ overrides: {} })
        .expect(404);
    });
  });

  describe('generated pages', () => {
    it('generates, creates, fetches, and edits a generated page', async () => {
      const agentRes = await request(app)
        .post('/agent/page')
        .send({
          userId: 'user-a',
          viewId: 'dashboard',
          sessionId: 'client-a',
          routeId: 'dashboard',
          prompt: 'Create an overview page',
          sources: [
            {
              viewId: 'dashboard',
              routeId: 'dashboard',
              path: '/',
              label: 'Dashboard',
              capturedAt: '2026-01-01T00:00:00.000Z',
              visualFragments: [
                {
                  id: 'visual-dashboard-0',
                  label: 'Claim mix chart',
                  routeId: 'dashboard',
                  path: 'morph.div:0',
                  html: '<section><h2>Claim mix chart</h2><svg role="img" aria-label="Pie chart"><circle cx="8" cy="8" r="8"></circle></svg></section>',
                  text: 'Claim mix chart',
                },
              ],
              snapshot: {
                viewId: 'dashboard',
                nodeCount: 2,
                nodes: [
                  {
                    path: 'morph.div:0',
                    tag: 'div',
                    segment: 'div:0',
                    textLeaf: false,
                    hidden: false,
                    children: [
                      {
                        path: 'morph.div:0.h1:0',
                        tag: 'h1',
                        segment: 'h1:0',
                        text: 'Claims overview',
                        textLeaf: true,
                        hidden: false,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        })
        .expect(200);

      expect(agentRes.body.definition.title).toBe('Create an overview page');
      expect(agentRes.body.definition.sections[0].items[0].text).toBe('Claims overview');
      expect(agentRes.body.definition.sections[0].visualHtml).toContain('<svg');

      const createRes = await request(app)
        .post('/pages')
        .send({
          userId: 'user-a',
          sessionId: 'client-a',
          routeId: 'dashboard',
          prompt: 'Create an overview page',
          sources: [
            {
              viewId: 'dashboard',
              routeId: 'dashboard',
              path: '/',
              label: 'Dashboard',
              capturedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          definition: agentRes.body.definition,
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        userId: 'user-a',
        sessionId: 'client-a',
        title: 'Create an overview page',
        prompt: 'Create an overview page',
        version: 1,
      });
      expect(createRes.body.viewId).toMatch(/^page:/);
      expect(typeof createRes.body.pageId).toBe('string');

      const pageId = createRes.body.pageId as string;
      const getRes = await request(app).get(`/pages/${pageId}`).expect(200);
      expect(getRes.body.definition).toEqual(agentRes.body.definition);

      const overrides = { 'morph.section:0': { style: { backgroundColor: '#ffffff' } } };
      await request(app)
        .put(`/pages/${pageId}/config`)
        .send({ overrides })
        .expect(200)
        .expect(overrides);

      await request(app)
        .get(`/pages/${pageId}/config`)
        .expect(200)
        .expect(overrides);
    });

    it('returns 404 for unknown generated pages', async () => {
      await request(app).get('/pages/missing-page').expect(404);
      await request(app).get('/pages/missing-page/config').expect(404);
      await request(app)
        .put('/pages/missing-page/config')
        .send({ overrides: {} })
        .expect(404);
    });
  });

  describe('POST /override', () => {
    it('applies a manual override and returns full config', async () => {
      await request(app)
        .put('/config/demo-user/dashboard')
        .send({
          overrides: {
            'morph.div:0.h1:0': { style: { color: 'red' } },
          },
        })
        .expect(200);

      const res = await request(app)
        .post('/override')
        .send({
          userId: 'demo-user',
          viewId: 'dashboard',
          path: 'morph.div:1',
          type: 'manual',
          changes: { hidden: true },
        })
        .expect(200);

      expect(res.body).toEqual({
        'morph.div:0.h1:0': { style: { color: 'red' } },
        'morph.div:1': { hidden: true },
      });
    });

    it('accepts ai_prompt requests without mutating config', async () => {
      const overrides = { 'morph.div:0': { text: 'Hello' } };

      await request(app)
        .put('/config/demo-user/dashboard')
        .send({ overrides })
        .expect(200);

      const res = await request(app)
        .post('/override')
        .send({
          userId: 'demo-user',
          viewId: 'dashboard',
          path: 'morph.div:0',
          type: 'ai_prompt',
          prompt: 'make this bigger',
        })
        .expect(200);

      expect(res.body).toEqual(overrides);

      const getRes = await request(app)
        .get('/config/demo-user/dashboard')
        .expect(200);

      expect(getRes.body).toEqual(overrides);
    });

    it('rejects invalid manual override payloads', async () => {
      const res = await request(app)
        .post('/override')
        .send({
          userId: 'demo-user',
          viewId: 'dashboard',
          path: 'morph.div:0',
          type: 'manual',
          changes: { style: { color: 'url(http://evil.test)' } },
        })
        .expect(400);

      expect(res.body.error).toMatch(/disallowed content/);
    });

    it('rejects ai_prompt without prompt', async () => {
      const res = await request(app)
        .post('/override')
        .send({
          userId: 'demo-user',
          viewId: 'dashboard',
          path: 'morph.div:0',
          type: 'ai_prompt',
        })
        .expect(400);

      expect(res.body).toEqual({
        error: 'prompt is required for ai_prompt overrides',
      });
    });
  });
});

function minimalSnapshot() {
  return {
    viewId: 'dashboard',
    nodeCount: 1,
    nodes: [
      {
        path: 'morph.div:0',
        tag: 'motion.div',
        segment: 'div:0',
        textLeaf: false,
        hidden: false,
        children: [],
      },
    ],
  };
}

describe('POST /agent/message', () => {
  it('rejects requests without snapshot', async () => {
    const res = await request(app)
      .post('/agent/message')
      .send({
        userId: 'demo-user',
        viewId: 'dashboard',
        message: 'hello',
        config: {},
      })
      .expect(400);

    expect(res.body.error).toMatch(/snapshot/);
  });

  it('rejects requests without GEMINI_API_KEY when valid payload', async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const res = await request(app)
      .post('/agent/message')
      .send({
        userId: 'demo-user',
        viewId: 'dashboard',
        message: 'What is on this page?',
        config: {},
        snapshot: minimalSnapshot(),
      })
      .expect(400);

    expect(res.body.error).toMatch(/GEMINI_API_KEY/);

    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
  });
});
