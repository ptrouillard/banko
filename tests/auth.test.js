import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, authHeader, login, cleanDb } from './helpers.js';

beforeAll(() => cleanDb());
afterAll(() => cleanDb());

describe('POST /api/auth/register', () => {
  it('crée un nouvel utilisateur', async () => {
    const res = await api.post('/api/auth/register').send({ username: 'alice', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.username).toBe('alice');
  });

  it('rejette un pseudo déjà utilisé', async () => {
    const res = await api.post('/api/auth/register').send({ username: 'alice', password: 'other' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/déjà utilisé/i);
  });

  it('rejette une création sans mot de passe', async () => {
    const res = await api.post('/api/auth/register').send({ username: 'bob' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  it('connecte avec les bons identifiants', async () => {
    const res = await api.post('/api/auth/login').send({ username: 'alice', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.username).toBe('alice');
  });

  it('rejette un mauvais mot de passe', async () => {
    const res = await api.post('/api/auth/login').send({ username: 'alice', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejette un utilisateur inexistant', async () => {
    const res = await api.post('/api/auth/login').send({ username: 'nobody', password: 'pass' });
    expect(res.status).toBe(401);
  });
});

describe('Gestion des utilisateurs (admin)', () => {
  let adminToken;

  beforeAll(async () => {
    await api.post('/api/auth/register').send({ username: 'admin', password: 'adminpass' });
    adminToken = await login('admin', 'adminpass');
  });

  it('liste les utilisateurs', async () => {
    const res = await api.get('/api/auth/users').set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('refuse sans token', async () => {
    const res = await api.get('/api/auth/users');
    expect(res.status).toBe(401);
  });

  it('bloque un utilisateur et empêche sa connexion', async () => {
    await api.post('/api/auth/register').send({ username: 'victim', password: 'pass' });
    const usersRes = await api.get('/api/auth/users').set(authHeader(adminToken));
    const victim = usersRes.body.find((u) => u.username === 'victim');

    const blockRes = await api.post(`/api/auth/users/${victim.id}/block`).set(authHeader(adminToken));
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.is_blocked).toBe(true);

    const loginRes = await api.post('/api/auth/login').send({ username: 'victim', password: 'pass' });
    expect(loginRes.status).toBe(403);
  });

  it('change le mot de passe d\'un utilisateur', async () => {
    const usersRes = await api.get('/api/auth/users').set(authHeader(adminToken));
    const alice = usersRes.body.find((u) => u.username === 'alice');

    const res = await api.put(`/api/auth/users/${alice.id}/password`)
      .set(authHeader(adminToken))
      .send({ password: 'newpass456' });
    expect(res.status).toBe(200);

    const loginRes = await api.post('/api/auth/login').send({ username: 'alice', password: 'newpass456' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  it('supprime un utilisateur', async () => {
    await api.post('/api/auth/register').send({ username: 'todelete', password: 'pass' });
    const usersRes = await api.get('/api/auth/users').set(authHeader(adminToken));
    const todelete = usersRes.body.find((u) => u.username === 'todelete');

    const res = await api.delete(`/api/auth/users/${todelete.id}`).set(authHeader(adminToken));
    expect(res.status).toBe(200);

    const loginRes = await api.post('/api/auth/login').send({ username: 'todelete', password: 'pass' });
    expect(loginRes.status).toBe(401);
  });
});
