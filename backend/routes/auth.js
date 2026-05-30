import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run([username, hashed]);
    return res.json({ ok: true, id: Number(info.lastInsertRowid), username });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ce pseudo est déjà utilisé' });
    }
    return res.status(500).json({ error: 'Erreur serveur lors de la création' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

  if (user.is_blocked) return res.status(403).json({ error: 'Ce compte est bloqué' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

  const secret = process.env.JWT_SECRET || 'banko_secret';
  const token = jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '8h' });
  return res.json({ token, username: user.username });
});

// Routes d'administration — accessibles uniquement aux utilisateurs authentifiés
router.get('/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, last_login, is_blocked FROM users ORDER BY username').all();
  return res.json(users);
});

router.post('/users/:id/block', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, is_blocked FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (user.username === req.user.username) return res.status(400).json({ error: 'Impossible de se bloquer soi-même' });
  db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run([user.is_blocked ? 0 : 1, user.id]);
  return res.json({ ok: true, is_blocked: !user.is_blocked });
});

router.delete('/users/:id', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (user.username === req.user.username) return res.status(400).json({ error: 'Impossible de supprimer son propre compte' });
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  return res.json({ ok: true });
});

router.put('/users/:id/password', authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Mot de passe requis' });
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const hashed = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run([hashed, user.id]);
  return res.json({ ok: true });
});

export default router;
