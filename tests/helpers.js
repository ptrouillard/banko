import request from 'supertest';
import app from '../backend/index.js';
import db from '../backend/db.js';

export const api = request(app);

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function login(username, password) {
  const res = await api.post('/api/auth/login').send({ username, password });
  return res.body.token;
}

export function cleanDb() {
  db.exec('DELETE FROM portefeuille_categories');
  db.exec('DELETE FROM portefeuilles');
  db.exec('DELETE FROM categories');
  db.exec('DELETE FROM data');
  db.exec('DELETE FROM mois');
  db.exec('DELETE FROM users');
}
