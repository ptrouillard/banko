import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_FILE || path.join(__dirname, 'banquo.sqlite');
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`);

db.exec(`
CREATE TABLE IF NOT EXISTS data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  libelle TEXT NOT NULL,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  date_import TEXT NOT NULL,
  categorie TEXT,
  UNIQUE(date, libelle)
);`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_data_categorie ON data(categorie);`);

// Table mois : liste des mois présents dans les données importées
db.exec(`
CREATE TABLE IF NOT EXISTS mois (
  mois TEXT PRIMARY KEY  -- format YYYY-MM
);`);

// Table categories : libellé unique + pattern de détection automatique
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle TEXT UNIQUE NOT NULL,
  pattern TEXT DEFAULT ''
);`);

export default db;
