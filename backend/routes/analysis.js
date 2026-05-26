import express from 'express';
import db from '../db.js';

const router = express.Router();

// Liste des mois depuis la table dédiée
router.get('/months', (req, res) => {
  const rows = db.prepare('SELECT mois FROM mois ORDER BY mois DESC').all();
  return res.json(rows.map((r) => r.mois));
});

// Résumé dépenses / recettes pour un mois
router.get('/summary', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Mois requis' });

  const data = db.prepare(`
    SELECT
      SUM(debit)  AS total_debit,
      SUM(credit) AS total_credit
    FROM data
    WHERE substr(date, 1, 7) = ?
  `).get(month);

  return res.json({ month, total_debit: data.total_debit || 0, total_credit: data.total_credit || 0 });
});

// Tableau des recettes du mois
router.get('/receipts', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Mois requis' });

  const rows = db.prepare(`
    SELECT id, date, libelle, credit AS amount
    FROM data
    WHERE substr(date, 1, 7) = ? AND credit > 0
    ORDER BY date DESC
  `).all(month);

  return res.json(rows);
});

// Tableau des dépenses du mois
router.get('/expenses', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Mois requis' });

  const rows = db.prepare(`
    SELECT id, date, libelle, debit AS amount, categorie
    FROM data
    WHERE substr(date, 1, 7) = ? AND debit > 0
    ORDER BY date DESC
  `).all(month);

  return res.json(rows);
});

// Sauvegarde catégorie sur une dépense
router.post('/expense/:id/category', (req, res) => {
  const { id } = req.params;
  const { categorie } = req.body;
  if (!categorie) return res.status(400).json({ error: 'Catégorie requise' });

  const cat = String(categorie).trim();
  db.prepare('UPDATE data SET categorie = ? WHERE id = ?').run(cat, id);

  // Enregistre automatiquement la catégorie dans la table categories si inconnue
  try {
    db.prepare('INSERT OR IGNORE INTO categories (libelle, pattern) VALUES (?, ?)').run(cat, '');
  } catch { /* ignore */ }

  return res.json({ success: true, id, categorie: cat });
});

// RAZ de la table mois + recalcul depuis data
router.post('/settings/reset-months', (req, res) => {
  db.prepare('DELETE FROM mois').run();

  const rows = db.prepare(`
    SELECT DISTINCT substr(date, 1, 7) AS mois
    FROM data
    WHERE date LIKE '____-__-%'
    AND substr(date, 6, 2) BETWEEN '01' AND '12'
  `).all();

  const insert = db.prepare('INSERT OR IGNORE INTO mois (mois) VALUES (?)');
  for (const row of rows) {
    insert.run(row.mois);
  }

  return res.json({ success: true, count: rows.length });
});

export default router;
