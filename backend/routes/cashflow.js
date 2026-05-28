import express from 'express';
import db from '../db.js';

const router = express.Router();

const PERIODS = {
  '1m':  { days: 30,  granularity: 'day' },
  '3m':  { days: 90,  granularity: 'day' },
  '6m':  { days: 180, granularity: 'week' },
  '1y':  { days: 365, granularity: 'month' },
  'all': { days: null, granularity: 'month' },
};

router.get('/', (req, res) => {
  const { period = '3m' } = req.query;
  const config = PERIODS[period] || PERIODS['3m'];

  const lastRow = db.prepare('SELECT MAX(date) AS last_date FROM data').get();
  const lastDate = lastRow?.last_date;
  if (!lastDate) return res.json({ points: [], granularity: config.granularity, period });

  let startDate = null;
  if (config.days !== null) {
    const d = new Date(lastDate.slice(0, 10));
    d.setDate(d.getDate() - config.days + 1);
    startDate = d.toISOString().slice(0, 10);
  }

  const dateFilter = startDate ? `AND d.date >= '${startDate}'` : '';

  // Exclude "interne" type operations (transfers between accounts)
  const rows = db.prepare(`
    SELECT d.date, d.debit, d.credit
    FROM data d
    LEFT JOIN categories c ON (
      (d.categorie_id IS NOT NULL AND d.categorie_id = c.id) OR
      (d.categorie_id IS NULL AND d.categorie IS NOT NULL AND d.categorie = c.libelle)
    )
    WHERE (c.type IS NULL OR c.type != 'interne')
    ${dateFilter}
    ORDER BY d.date ASC
  `).all();

  const grouped = {};
  for (const row of rows) {
    const date = row.date.slice(0, 10);
    let key;
    if (config.granularity === 'day') {
      key = date;
    } else if (config.granularity === 'week') {
      const d = new Date(date);
      const dow = d.getDay() || 7; // Sunday → 7
      d.setDate(d.getDate() - dow + 1); // Monday of the week
      key = d.toISOString().slice(0, 10);
    } else {
      key = row.date.slice(0, 7);
    }
    if (!grouped[key]) grouped[key] = 0;
    grouped[key] += (row.credit || 0) - (row.debit || 0);
  }

  const points = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, net]) => ({ label, net: Math.round(net * 100) / 100 }));

  return res.json({ points, granularity: config.granularity, period });
});

export default router;
