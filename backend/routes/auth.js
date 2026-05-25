import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
  }

  const hashed = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const info = stmt.run(username, hashed);
    const secret = process.env.JWT_SECRET || 'banquo_secret';
    const token = jwt.sign({ id: info.lastInsertRowid, username }, secret, { expiresIn: '8h' });
    return res.json({ id: info.lastInsertRowid, username, token });
  } catch (error) {
    return res.status(409).json({ error: 'Ce pseudo est déjà utilisé' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const secret = process.env.JWT_SECRET || 'banquo_secret';
  const token = jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '8h' });
  return res.json({ token, username: user.username });
});

export default router;
