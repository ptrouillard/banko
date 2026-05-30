import express from 'express';
import db from '../db.js';

const router = express.Router();

// Liste paginée des données
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(200, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;

  const where = search ? "WHERE libelle LIKE ? OR date LIKE ?" : "";
  const params = search ? [search, search] : [];

  const total = db.prepare(`SELECT COUNT(*) AS count FROM data ${where}`).get(params).count;
  const rows = db.prepare(`
    SELECT id, date, libelle, debit, credit, date_import, categorie
    FROM data ${where}
    ORDER BY date DESC, id DESC
    LIMIT ? OFFSET ?
  `).all([...params, limit, offset]);

  return res.json({ rows, total, page, limit });
});

// Vider toute la base (opérations + mois)
router.delete('/all', (req, res) => {
  db.prepare('DELETE FROM data').run();
  db.prepare('DELETE FROM mois').run();
  return res.json({ success: true });
});

// Suppression d'une ligne
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM data WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Ligne introuvable' });
  return res.json({ success: true });
});

export default router;
