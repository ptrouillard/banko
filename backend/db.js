import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_FILE || path.join(__dirname, 'banquo.sqlite');
const db = new Database(dbPath);

const createUsers = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

const createData = `
CREATE TABLE IF NOT EXISTS data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  libelle TEXT NOT NULL,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  date_import TEXT NOT NULL,
  categorie TEXT,
  UNIQUE(date, libelle)
);`;

const createCategoryIndex = `CREATE INDEX IF NOT EXISTS idx_data_categorie ON data(categorie);`;

db.exec(createUsers);
db.exec(createData);
db.exec(createCategoryIndex);

export default db;
