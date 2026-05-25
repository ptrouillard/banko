import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/suggest', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 3) {
    return res.json([]);
  }

  const search = `${q}%`;
  const rows = db.prepare(`
    SELECT DISTINCT categorie
    FROM data
    WHERE categorie IS NOT NULL AND categorie != '' AND categorie LIKE ?
    ORDER BY categorie
    LIMIT 10
  `).all(search);

  return res.json(rows.map((row) => row.categorie));
});

export default router;
