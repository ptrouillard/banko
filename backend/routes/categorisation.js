import express from 'express';
import db from '../db.js';

const router = express.Router();

// Stats : catégorisées vs à catégoriser
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS count FROM data').get().count;
  const categorized = db.prepare('SELECT COUNT(*) AS count FROM data WHERE categorie_id IS NOT NULL').get().count;
  return res.json({ categorized, uncategorized: total - categorized });
});

// Liste paginée des opérations non catégorisées (plus récentes d'abord)
router.get('/uncategorized', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) AS count FROM data WHERE categorie_id IS NULL').get().count;
  const rows = db.prepare(`
    SELECT id, date, libelle, debit, credit
    FROM data
    WHERE categorie_id IS NULL
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  return res.json({ rows, total, page, totalPages: Math.ceil(total / limit) || 1 });
});

// Applique une catégorie à une opération + cascade sur les uncategorized qui matchent le mot-clé
router.post('/apply', (req, res) => {
  const { operation_id, categorie_id, new_category_name, keyword } = req.body;

  if (!operation_id || !keyword || !String(keyword).trim()) {
    return res.status(400).json({ error: 'operation_id et keyword requis' });
  }

  const kw = String(keyword).trim();
  let catId = categorie_id ? parseInt(categorie_id) : null;

  if (!catId) {
    if (!new_category_name || !String(new_category_name).trim()) {
      return res.status(400).json({ error: 'Nom de catégorie requis pour une nouvelle catégorie' });
    }
    const name = String(new_category_name).trim();
    const { type } = req.body;
    const validType = ['depense', 'recette'].includes(type) ? type : null;
    try {
      const info = db.prepare('INSERT INTO categories (libelle, pattern, type) VALUES (?, ?, ?)').run(name, kw, validType);
      catId = info.lastInsertRowid;
    } catch {
      const existing = db.prepare('SELECT id FROM categories WHERE libelle = ?').get(name);
      if (!existing) return res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
      catId = existing.id;
      db.prepare('UPDATE categories SET pattern = ?, type = ? WHERE id = ?').run(kw, validType, catId);
    }
  }

  const cat = db.prepare('SELECT id, libelle FROM categories WHERE id = ?').get(catId);
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });

  // Cascade : toutes les opérations non catégorisées dont le libellé contient le mot-clé (insensible à la casse)
  const result = db.prepare(`
    UPDATE data
    SET categorie_id = ?, categorie = ?
    WHERE categorie_id IS NULL
    AND UPPER(libelle) LIKE '%' || UPPER(?) || '%'
  `).run(cat.id, cat.libelle, kw);

  // Forcer la catégorisation de l'opération sélectionnée si elle n'a pas matché (keyword différent du libellé)
  const check = db.prepare('SELECT categorie_id FROM data WHERE id = ?').get(operation_id);
  let extra = 0;
  if (!check?.categorie_id) {
    db.prepare('UPDATE data SET categorie_id = ?, categorie = ? WHERE id = ?').run(cat.id, cat.libelle, operation_id);
    extra = 1;
  }

  return res.json({ applied: result.changes + extra, categorie: cat.libelle });
});

export default router;
