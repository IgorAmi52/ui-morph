import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

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
