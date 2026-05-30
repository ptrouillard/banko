import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import analysisRouter from './routes/analysis.js';
import categoriesRouter from './routes/categories.js';
import categorisationRouter from './routes/categorisation.js';
import portefeuillesRouter from './routes/portefeuilles.js';
import dataRouter from './routes/data.js';
import cashflowRouter from './routes/cashflow.js';
import repartitionRouter from './routes/repartition.js';
import evolutionRouter from './routes/evolution.js';
import { authMiddleware } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const B = process.env.BASE_URL || ''; // '/banko' en prod, '' en local

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use(B + '/api/auth', authRouter);
app.use(B + '/api/upload', authMiddleware, uploadRouter);
app.use(B + '/api/analysis', authMiddleware, analysisRouter);
app.use(B + '/api/categories', authMiddleware, categoriesRouter);
app.use(B + '/api/categorisation', authMiddleware, categorisationRouter);
app.use(B + '/api/portefeuilles', authMiddleware, portefeuillesRouter);
app.use(B + '/api/data', authMiddleware, dataRouter);
app.use(B + '/api/cashflow', authMiddleware, cashflowRouter);
app.use(B + '/api/repartition', authMiddleware, repartitionRouter);
app.use(B + '/api/evolution', authMiddleware, evolutionRouter);
app.get(B + '/api/ping', (req, res) => res.json({ ok: true }));

// En production, sert le build React depuis ../frontend/dist
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(B, express.static(frontendDist));
  app.get(B + '/*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.listen(port, () => {
  console.log(`Backend démarré sur http://localhost:${port}`);
});
