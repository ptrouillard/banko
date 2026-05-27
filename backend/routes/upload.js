import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import db from '../db.js';
import { loadRules, applyRules } from '../regles/loader.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

function normalizeHeader(value) {
  return String(value || '').toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ');
}

function normalizeDate(str) {
  if (!str) return '';
  const s = String(str).trim();

  // Serial numérique Excel (ex: 46163 ou 46163.0)
  const serial = parseFloat(s);
  if (!isNaN(serial) && serial > 1000 && !/[\/\-]/.test(s)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + Math.floor(serial) * 86400000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  // DD/MM/YYYY ou D/M/YYYY ou DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T].*)?$/);
  if (m) {
    let day = m[1].padStart(2, '0');
    let month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  // Tentative native en dernier recours
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return '';
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const normalized = String(value).replace(/\s/g, '').replace(',', '.');
  const number = parseFloat(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parseRowsFromCA(rows) {
  const headers = rows.find((row) => {
    const normalized = row.map((cell) => normalizeHeader(cell));
    return normalized.includes('date') && normalized.includes('libelle');
  });

  if (!headers) {
    return { error: 'format de fichier non supporté pour le moment' };
  }

  const headerIndex = rows.indexOf(headers);
  const normalizedHeaders = headers.map((cell) => normalizeHeader(cell));

  const dateKey = normalizedHeaders.findIndex((key) => key === 'date');
  const libelleKey = normalizedHeaders.findIndex((key) => key === 'libelle');
  const DEBIT_HEADERS = ['debit', 'debit euros', 'montant debit', 'montant debite', 'debit euro'];
  const CREDIT_HEADERS = ['credit', 'credit euros', 'montant credit', 'montant credite', 'credit euro'];
  const debitKey = normalizedHeaders.findIndex((key) => DEBIT_HEADERS.includes(key));
  const creditKey = normalizedHeaders.findIndex((key) => CREDIT_HEADERS.includes(key));

  if (dateKey === -1 || libelleKey === -1) {
    return { error: 'format de fichier non supporté pour le moment' };
  }

  const dataRows = rows.slice(headerIndex + 1);
  const extracted = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const date = String(row[dateKey] || '').trim();
    const libelle = String(row[libelleKey] || '').trim();
    if (!date || !libelle) continue;
    const debit = parseNumber(row[debitKey]);
    const credit = parseNumber(row[creditKey]);
    extracted.push({ date, libelle, debit, credit });
  }

  return { rows: extracted };
}

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier manquant' });
  }

  try {
    console.log('[import] fichier reçu:', req.file.originalname, 'taille:', req.file.size);

    // raw:true pour récupérer les serials numériques bruts des dates
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', raw: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    // Pour détecter "CREDIT AGRICOLE" on repasse en string
    const fileText = rawRows.flat().map(String).join(' ').toUpperCase();
    const creditAgricoleCount = (fileText.match(/CREDIT AGRICOLE/g) || []).length;
    console.log('[import] occurrences "CREDIT AGRICOLE":', creditAgricoleCount);

    if (creditAgricoleCount <= 10) {
      console.log('[import] format non supporté (peu d\'occurrences CREDIT AGRICOLE)');
      return res.status(400).json({ error: 'format de fichier non supporté pour le moment' });
    }

    const parseResult = parseRowsFromCA(rawRows);
    if (parseResult.error) {
      console.log('[import] erreur parsing CA:', parseResult.error);
      return res.status(400).json({ error: parseResult.error });
    }

    const rows = parseResult.rows;
    console.log('[import] lignes extraites après parsing:', rows.length);

    // Chargement des règles de catégorisation automatique pour Crédit Agricole
    const rules = loadRules('CREDIT_AGRICOLE');
    console.log('[import] règles chargées:', rules.length);

    // Caches intra-import pour éviter les requêtes répétées
    const categoryCache = new Map();
    const portfolioCache = new Map();

    const getOrCreateCategory = (libelle, type) => {
      if (categoryCache.has(libelle)) return categoryCache.get(libelle);
      let cat = db.prepare('SELECT id FROM categories WHERE libelle = ?').get(libelle);
      if (!cat) {
        const validType = ['depense', 'recette'].includes(type) ? type : null;
        const info = db.prepare('INSERT INTO categories (libelle, pattern, type) VALUES (?, ?, ?)').run(libelle, '', validType);
        cat = { id: info.lastInsertRowid };
      }
      categoryCache.set(libelle, cat.id);
      return cat.id;
    };

    const getOrCreatePortfolio = (nom) => {
      if (portfolioCache.has(nom)) return portfolioCache.get(nom);
      let pf = db.prepare('SELECT id FROM portefeuilles WHERE nom = ?').get(nom);
      if (!pf) {
        const info = db.prepare('INSERT INTO portefeuilles (nom) VALUES (?)').run(nom);
        pf = { id: info.lastInsertRowid };
      }
      portfolioCache.set(nom, pf.id);
      return pf.id;
    };

    let imported = 0;
    let duplicates = 0;
    let autoCategorized = 0;
    let minDate = null;
    let maxDate = null;

    const insert = db.prepare(`
      INSERT INTO data (date, libelle, debit, credit, date_import, categorie_id, categorie)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date, libelle) DO UPDATE SET
        debit = CASE WHEN data.debit = 0 THEN excluded.debit ELSE data.debit END,
        credit = CASE WHEN data.credit = 0 THEN excluded.credit ELSE data.credit END,
        categorie_id = CASE WHEN data.categorie_id IS NULL THEN excluded.categorie_id ELSE data.categorie_id END,
        categorie = CASE WHEN data.categorie IS NULL THEN excluded.categorie ELSE data.categorie END
    `);

    const getExisting = db.prepare('SELECT debit, credit FROM data WHERE date = ? AND libelle = ?');
    const linkCatPortfolio = db.prepare('INSERT OR IGNORE INTO portefeuille_categories (portefeuille_id, categorie_id) VALUES (?, ?)');
    const now = new Date().toISOString();

    // Mise à jour de la table mois après import
    const insertMois = db.prepare(`INSERT OR IGNORE INTO mois (mois) VALUES (?)`);

    console.log('[import] démarrage insertion en base, total:', rows.length);

    for (const raw of rows) {
      const libelle = String(raw.libelle).trim();
      if (!raw.date || !libelle) continue;

      const normalizedDate = normalizeDate(raw.date);
      if (!normalizedDate) {
        console.warn('[import] date ignorée (non parsable):', raw.date);
        continue;
      }

      const existing = getExisting.get(normalizedDate, libelle);
      // Doublon réel : la ligne existe et a déjà des montants corrects
      if (existing && (existing.debit !== 0 || existing.credit !== 0)) {
        duplicates += 1;
        continue;
      }

      // Application des règles de catégorisation automatique
      const ruleMatch = applyRules(libelle, rules);
      let autoCategId = null;
      let autoCat = null;

      if (ruleMatch && ruleMatch.categorie) {
        autoCategId = getOrCreateCategory(ruleMatch.categorie, ruleMatch.type);
        autoCat = ruleMatch.categorie;

        if (ruleMatch.portefeuille) {
          const pfId = getOrCreatePortfolio(ruleMatch.portefeuille);
          linkCatPortfolio.run(pfId, autoCategId);
        }

        autoCategorized += 1;
      }

      insert.run(normalizedDate, libelle, raw.debit, raw.credit, now, autoCategId, autoCat);
      imported += 1;

      // Enregistrement du mois (format YYYY-MM)
      const monthKey = normalizedDate.slice(0, 7);
      insertMois.run(monthKey);

      const current = new Date(normalizedDate);
      if (!Number.isNaN(current.getTime())) {
        if (!minDate || current < minDate) minDate = current;
        if (!maxDate || current > maxDate) maxDate = current;
      }
    }

    console.log('[import] terminé. importés:', imported, 'doublons:', duplicates, 'auto-catégorisés:', autoCategorized);

    return res.json({
      imported,
      duplicates,
      autoCategorized,
      firstDate: minDate ? minDate.toISOString().slice(0, 10) : null,
      lastDate: maxDate ? maxDate.toISOString().slice(0, 10) : null,
    });
  } catch (err) {
    console.error('[import] erreur inattendue:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Erreur lors de l\'import' });
  }
});

export default router;
