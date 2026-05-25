import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import db from '../db.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

function normalizeRow(row) {
  const keys = Object.keys(row).reduce((acc, key) => {
    acc[key.toString().trim().toLowerCase()] = row[key];
    return acc;
  }, {});

  return {
    date: keys.date || keys['date operation'] || keys['date opération'] || keys['date operation'] || keys['date opération'] || '',
    libelle: keys.libelle || keys['libellé'] || keys['description'] || '',
    debit: parseFloat(keys.debit || keys['debit'] || keys['montant débit'] || 0) || 0,
    credit: parseFloat(keys.credit || keys['credit'] || keys['montant crédit'] || 0) || 0,
  };
}

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier manquant' });
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  let imported = 0;
  let duplicates = 0;
  let minDate = null;
  let maxDate = null;

  const insert = db.prepare(`INSERT OR IGNORE INTO data
    (date, libelle, debit, credit, date_import)
    VALUES (?, ?, ?, ?, ?)`);

  const getExisting = db.prepare('SELECT COUNT(*) AS count FROM data WHERE date = ? AND libelle = ?');
  const now = new Date().toISOString();

  for (const raw of rows) {
    const { date, libelle, debit, credit } = normalizeRow(raw);
    if (!date || !libelle) continue;

    const existing = getExisting.get(date, String(libelle).trim());
    if (existing?.count > 0) {
      duplicates += 1;
      continue;
    }

    insert.run(date, String(libelle).trim(), debit, credit, now);
    imported += 1;

    const current = new Date(date);
    if (!Number.isNaN(current.getTime())) {
      if (!minDate || current < minDate) minDate = current;
      if (!maxDate || current > maxDate) maxDate = current;
    }
  }

  return res.json({
    imported,
    duplicates,
    firstDate: minDate ? minDate.toISOString().slice(0, 10) : null,
    lastDate: maxDate ? maxDate.toISOString().slice(0, 10) : null,
  });
});

export default router;
