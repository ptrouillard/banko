import express from 'express';
import db from '../db.js';

const router = express.Router();

// Liste tous les portefeuilles
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT p.id, p.nom,
      COUNT(pc.categorie_id) AS nb_categories
    FROM portefeuilles p
    LEFT JOIN portefeuille_categories pc ON pc.portefeuille_id = p.id
    GROUP BY p.id
    ORDER BY p.nom
  `).all();

  return res.json(rows);
});

// Crée un portefeuille
router.post('/', (req, res) => {
  const { nom } = req.body;
  if (!nom || !String(nom).trim()) return res.status(400).json({ error: 'Nom requis' });
  try {
    const info = db.prepare('INSERT INTO portefeuilles (nom) VALUES (?)').run(String(nom).trim());
    return res.json({ id: info.lastInsertRowid, nom: String(nom).trim(), nb_categories: 0 });
  } catch {
    return res.status(409).json({ error: 'Un portefeuille avec ce nom existe déjà' });
  }
});

// Vide tous les portefeuilles et leurs liens
router.delete('/all', (req, res) => {
  db.prepare('DELETE FROM portefeuille_categories').run();
  db.prepare('DELETE FROM portefeuilles').run();
  return res.json({ success: true });
});

// Supprime un portefeuille
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const p = db.prepare('SELECT * FROM portefeuilles WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Portefeuille introuvable' });
  db.prepare('DELETE FROM portefeuille_categories WHERE portefeuille_id = ?').run(id);
  db.prepare('DELETE FROM portefeuilles WHERE id = ?').run(id);
  return res.json({ success: true });
});

// Catégories orphelines (non rattachées à aucun portefeuille)
router.get('/orphan-categories', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.libelle, c.type, c.pattern
    FROM categories c
    WHERE c.id NOT IN (SELECT categorie_id FROM portefeuille_categories)
    ORDER BY c.libelle
  `).all();
  return res.json({ count: rows.length, categories: rows });
});

// Détail : catégories + opérations (mois optionnel — toutes données si absent)
router.get('/:id/detail', (req, res) => {
  const { id } = req.params;
  const { month } = req.query;

  const p = db.prepare('SELECT * FROM portefeuilles WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Portefeuille introuvable' });

  const categories = db.prepare(`
    SELECT c.id, c.libelle, c.type
    FROM portefeuille_categories pc
    JOIN categories c ON c.id = pc.categorie_id
    WHERE pc.portefeuille_id = ?
    ORDER BY c.libelle
  `).all(id);

  if (categories.length === 0) {
    return res.json({ portefeuille: p, month: month || null, categories: [], operations: [], total_debit: 0, total_credit: 0 });
  }

  const catIds = categories.map((c) => c.id);
  const placeholders = catIds.map(() => '?').join(',');
  const monthFilter = month ? 'AND substr(d.date, 1, 7) = ?' : '';
  const queryParams = month ? [...catIds, month] : catIds;

  const operations = db.prepare(`
    SELECT d.id, d.date, d.libelle, d.debit, d.credit, c.libelle AS categorie_nom
    FROM data d
    JOIN categories c ON (
      (d.categorie_id IS NOT NULL AND d.categorie_id = c.id) OR
      (d.categorie_id IS NULL AND d.categorie = c.libelle)
    )
    WHERE c.id IN (${placeholders})
    ${monthFilter}
    ORDER BY d.date DESC
  `).all(...queryParams);

  const total_debit = operations.reduce((s, o) => s + (o.debit || 0), 0);
  const total_credit = operations.reduce((s, o) => s + (o.credit || 0), 0);

  const categoriesWithTotals = categories.map((cat) => {
    const ops = operations.filter((o) => o.categorie_nom === cat.libelle);
    return {
      ...cat,
      total_debit: ops.reduce((s, o) => s + (o.debit || 0), 0),
      total_credit: ops.reduce((s, o) => s + (o.credit || 0), 0),
    };
  });

  return res.json({ portefeuille: p, month: month || null, categories: categoriesWithTotals, operations, total_debit, total_credit });
});

// Ajoute une catégorie à un portefeuille
router.post('/:id/categories', (req, res) => {
  const { id } = req.params;
  const { categorie_id } = req.body;
  if (!categorie_id) return res.status(400).json({ error: 'categorie_id requis' });

  const p = db.prepare('SELECT * FROM portefeuilles WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Portefeuille introuvable' });

  try {
    db.prepare('INSERT INTO portefeuille_categories (portefeuille_id, categorie_id) VALUES (?, ?)').run(id, categorie_id);
    return res.json({ success: true });
  } catch {
    return res.status(409).json({ error: 'Cette catégorie est déjà dans ce portefeuille' });
  }
});

// Retire une catégorie d'un portefeuille
router.delete('/:id/categories/:cat_id', (req, res) => {
  const { id, cat_id } = req.params;

  const p = db.prepare('SELECT * FROM portefeuilles WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Portefeuille introuvable' });

  db.prepare('DELETE FROM portefeuille_categories WHERE portefeuille_id = ? AND categorie_id = ?').run(id, cat_id);
  return res.json({ success: true });
});

export default router;
