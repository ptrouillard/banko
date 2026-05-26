import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/months', (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT substr(date, 1, 7) AS month
    FROM data
    WHERE date LIKE '____-__-%'
      AND substr(date, 6, 2) BETWEEN '01' AND '12'
    ORDER BY month DESC
  `).all();
  return res.json(rows.map((row) => row.month));
});

router.get('/summary', (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ error: 'Mois requis' });
  }
  const data = db.prepare(`
    SELECT
      SUM(debit) AS total_debit,
      SUM(credit) AS total_credit
    FROM data
    WHERE substr(date, 1, 7) = ?
  `).get(month);
  return res.json({ month, total_debit: data.total_debit || 0, total_credit: data.total_credit || 0 });
});

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

router.post('/expense/:id/category', (req, res) => {
  const { id } = req.params;
  const { categorie } = req.body;
  if (!categorie) return res.status(400).json({ error: 'Catégorie requise' });
  const stmt = db.prepare('UPDATE data SET categorie = ? WHERE id = ?');
  stmt.run(String(categorie).trim(), id);
  return res.json({ success: true, id, categorie: String(categorie).trim() });
});

export default router;
