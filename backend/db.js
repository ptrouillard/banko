import nodeWasm from 'node-sqlite3-wasm';
const { Database } = nodeWasm;
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_FILE || path.join(__dirname, 'banko.sqlite');
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

// Migrations users
try { db.exec("ALTER TABLE users ADD COLUMN last_login TEXT"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0"); } catch {}

// Migration : ajout de categorie_id (FK vers categories)
try {
  db.exec('ALTER TABLE data ADD COLUMN categorie_id INTEGER REFERENCES categories(id)');
} catch { /* colonne déjà existante */ }

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
  pattern TEXT DEFAULT '',
  type TEXT
);`);

// Migration : ajout du champ type sur les catégories existantes
try {
  db.exec("ALTER TABLE categories ADD COLUMN type TEXT");
} catch { /* colonne déjà existante */ }

// Portefeuilles
db.exec(`
CREATE TABLE IF NOT EXISTS portefeuilles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT UNIQUE NOT NULL
);`);

db.exec(`
CREATE TABLE IF NOT EXISTS portefeuille_categories (
  portefeuille_id INTEGER NOT NULL REFERENCES portefeuilles(id),
  categorie_id INTEGER NOT NULL REFERENCES categories(id),
  PRIMARY KEY (portefeuille_id, categorie_id)
);`);

export default db;
