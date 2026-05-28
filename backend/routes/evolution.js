import express from 'express';
import db from '../db.js';

const router = express.Router();

function bucketKey(dateStr) {
  return dateStr.slice(0, 7);
}

router.get('/', (req, res) => {
  const { portefeuille_id, type } = req.query;
  if (!portefeuille_id || !['depense', 'recette'].includes(type)) {
    return res.status(400).json({ error: 'portefeuille_id et type requis' });
  }

  const amountCol = type === 'depense' ? 'debit' : 'credit';

  const rows = db.prepare(`
    SELECT d.date, d.${amountCol} AS montant
    FROM data d
    JOIN categories c ON (
      (d.categorie_id IS NOT NULL AND d.categorie_id = c.id) OR
      (d.categorie_id IS NULL AND d.categorie IS NOT NULL AND d.categorie = c.libelle)
    )
    JOIN portefeuille_categories pc ON pc.categorie_id = c.id
    WHERE pc.portefeuille_id = ?
      AND d.${amountCol} > 0
      AND (c.type IS NULL OR c.type != 'interne')
    ORDER BY d.date ASC
  `).all(portefeuille_id);

  if (rows.length === 0) {
    return res.json({ points: [], granularity: 'month', variation: null });
  }

  const grouped = new Map();
  for (const row of rows) {
    const key = bucketKey(row.date);
    grouped.set(key, (grouped.get(key) || 0) + (row.montant || 0));
  }

  const points = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, total]) => ({ label, total: Math.round(total * 100) / 100 }));

  let variation = null;
  if (points.length >= 2 && points[0].total > 0) {
    variation = Math.round(((points[points.length - 1].total - points[0].total) / points[0].total) * 1000) / 10;
  }

  return res.json({ points, granularity: 'month', variation });
});

export default router;
