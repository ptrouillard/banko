import express from 'express';
import db from '../db.js';

const router = express.Router();

// Suggestions d'autocomplétion depuis la table categories (libellé)
router.get('/suggest', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 3) return res.json([]);

  const search = `${q}%`;
  const rows = db.prepare(`
    SELECT libelle FROM categories
    WHERE libelle LIKE ?
    ORDER BY libelle
    LIMIT 10
  `).all(search);

  return res.json(rows.map((r) => r.libelle));
});

// Liste toutes les catégories
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, libelle, pattern FROM categories ORDER BY libelle').all();
  return res.json(rows);
});

// Crée une nouvelle catégorie
router.post('/', (req, res) => {
  const { libelle, pattern } = req.body;
  if (!libelle || !libelle.trim()) {
    return res.status(400).json({ error: 'Libellé requis' });
  }
  try {
    const info = db.prepare('INSERT INTO categories (libelle, pattern) VALUES (?, ?)').run(
      libelle.trim(),
      pattern ? pattern.trim() : ''
    );
    return res.json({ id: info.lastInsertRowid, libelle: libelle.trim(), pattern: pattern || '' });
  } catch {
    return res.status(409).json({ error: 'Cette catégorie existe déjà' });
  }
});

// Modifie le pattern d'une catégorie (libellé non modifiable)
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { pattern } = req.body;
  if (pattern === undefined) return res.status(400).json({ error: 'Pattern requis' });
  const info = db.prepare('UPDATE categories SET pattern = ? WHERE id = ?').run(pattern.trim(), id);
  if (info.changes === 0) return res.status(404).json({ error: 'Catégorie introuvable' });
  return res.json({ success: true });
});

// Supprime une catégorie
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Catégorie introuvable' });
  return res.json({ success: true });
});

export default router;
