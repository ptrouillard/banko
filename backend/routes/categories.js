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
  const rows = db.prepare('SELECT id, libelle, pattern, type FROM categories ORDER BY libelle').all();
  return res.json(rows);
});

// Crée une nouvelle catégorie
router.post('/', (req, res) => {
  const { libelle, pattern, type } = req.body;
  if (!libelle || !libelle.trim()) {
    return res.status(400).json({ error: 'Libellé requis' });
  }
  const validType = ['depense', 'recette', 'interne'].includes(type) ? type : null;
  try {
    const info = db.prepare('INSERT INTO categories (libelle, pattern, type) VALUES (?, ?, ?)').run(
      libelle.trim(),
      pattern ? pattern.trim() : '',
      validType
    );
    return res.json({ id: info.lastInsertRowid, libelle: libelle.trim(), pattern: pattern || '', type: validType });
  } catch {
    return res.status(409).json({ error: 'Cette catégorie existe déjà' });
  }
});

// Modifie le pattern et/ou le type d'une catégorie
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { pattern, type } = req.body;

  const updates = [];
  const params = [];

  if (pattern !== undefined) {
    updates.push('pattern = ?');
    params.push(pattern.trim());
  }
  if (type !== undefined) {
    const validType = ['depense', 'recette', 'interne'].includes(type) ? type : null;
    updates.push('type = ?');
    params.push(validType);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });

  params.push(id);
  const info = db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  if (info.changes === 0) return res.status(404).json({ error: 'Catégorie introuvable' });
  return res.json({ success: true });
});

// Vide toutes les catégories et nettoie les références associées
router.delete('/all', (req, res) => {
  db.prepare('DELETE FROM portefeuille_categories').run();
  db.prepare('UPDATE data SET categorie_id = NULL, categorie = NULL').run();
  db.prepare('DELETE FROM categories').run();
  return res.json({ success: true });
});

// Supprime une catégorie et nullifie les opérations qui y pointaient
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
  db.prepare('UPDATE data SET categorie_id = NULL, categorie = NULL WHERE categorie_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return res.json({ success: true });
});

export default router;
