import express from 'express';
import db from '../db.js';

const router = express.Router();

function getSlices(amountCol, monthFilter, month) {
  const whereMonth = monthFilter ? `AND substr(d.date, 1, 7) = ?` : '';
  const params = monthFilter ? [month] : [];

  const rows = db.prepare(`
    SELECT
      d.id, d.date, d.libelle,
      d.${amountCol} AS montant,
      COALESCE(c.libelle, '') AS cat_libelle,
      p.id AS port_id, p.nom AS port_nom
    FROM data d
    LEFT JOIN categories c ON (
      (d.categorie_id IS NOT NULL AND d.categorie_id = c.id) OR
      (d.categorie_id IS NULL AND d.categorie IS NOT NULL AND d.categorie = c.libelle)
    )
    LEFT JOIN (
      SELECT categorie_id, MIN(portefeuille_id) AS portefeuille_id
      FROM portefeuille_categories
      GROUP BY categorie_id
    ) pc ON pc.categorie_id = c.id
    LEFT JOIN portefeuilles p ON p.id = pc.portefeuille_id
    WHERE d.${amountCol} > 0
      AND (c.type IS NULL OR c.type != 'interne')
    ${whereMonth}
    ORDER BY d.date DESC
  `).all(params);

  const portfolioMap = new Map();

  for (const row of rows) {
    const key = row.port_id ?? 'none';
    if (!portfolioMap.has(key)) {
      portfolioMap.set(key, {
        portefeuille_id: row.port_id,
        portefeuille_nom: row.port_nom || 'Non classé',
        total: 0,
        operations: [],
      });
    }
    const p = portfolioMap.get(key);
    p.total += row.montant || 0;
    p.operations.push({
      id: row.id,
      date: row.date,
      libelle: row.libelle,
      montant: Math.round((row.montant || 0) * 100) / 100,
      categorie: row.cat_libelle || '—',
    });
  }

  return [...portfolioMap.values()]
    .sort((a, b) => {
      if (a.portefeuille_id === null && b.portefeuille_id !== null) return 1;
      if (a.portefeuille_id !== null && b.portefeuille_id === null) return -1;
      return b.total - a.total;
    })
    .map(s => ({ ...s, total: Math.round(s.total * 100) / 100 }));
}

router.get('/', (req, res) => {
  const { month } = req.query;
  const monthFilter = !!month;
  return res.json({
    depenses: getSlices('debit', monthFilter, month),
    recettes: getSlices('credit', monthFilter, month),
  });
});

export default router;
