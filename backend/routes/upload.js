import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import db from '../db.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

function normalizeHeader(value) {
  return String(value || '').toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ');
}

function normalizeDate(str) {
  if (!str) return '';
  const s = String(str).trim();
  // Try native parse
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  // DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T].*)?$/);
  if (m) {
    let day = m[1].padStart(2, '0');
    let month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
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
  const debitKey = normalizedHeaders.findIndex((key) => key === 'debit' || key === 'montant debit' || key === 'montant débité');
  const creditKey = normalizedHeaders.findIndex((key) => key === 'credit' || key === 'montant credit' || key === 'montant crédit');

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
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    const fileText = rawRows.flat().join(' ').toUpperCase();
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
  let imported = 0;
  let duplicates = 0;
  let minDate = null;
  let maxDate = null;

  const insert = db.prepare(`INSERT OR IGNORE INTO data
    (date, libelle, debit, credit, date_import)
    VALUES (?, ?, ?, ?, ?)`);
  const getExisting = db.prepare('SELECT COUNT(*) AS count FROM data WHERE date = ? AND libelle = ?');
  const now = new Date().toISOString();

    console.log('[import] démarrage insertion en base, total:', rows.length);
    for (const raw of rows) {
    const date = raw.date;
    const libelle = String(raw.libelle).trim();
    if (!date || !libelle) continue;

    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) continue;

    const existing = getExisting.get(normalizedDate, libelle);
    if (existing?.count > 0) {
      duplicates += 1;
      if (duplicates % 100 === 0) console.log('[import] doublon détecté, total jusqu\'ici:', duplicates);
      continue;
    }

    insert.run(normalizedDate, libelle, raw.debit, raw.credit, now);
    imported += 1;

    const current = new Date(normalizedDate);
    if (!Number.isNaN(current.getTime())) {
      if (!minDate || current < minDate) minDate = current;
      if (!maxDate || current > maxDate) maxDate = current;
    }
  }

    console.log('[import] terminé. importés:', imported, 'doublons:', duplicates);
    return res.json({
      imported,
      duplicates,
      firstDate: minDate ? minDate.toISOString().slice(0, 10) : null,
      lastDate: maxDate ? maxDate.toISOString().slice(0, 10) : null,
    });
  } catch (err) {
    console.error('[import] erreur inattendue:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Erreur lors de l\'import' });
  }
});

export default router;
