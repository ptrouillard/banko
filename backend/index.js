import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import analysisRouter from './routes/analysis.js';
import categoriesRouter from './routes/categories.js';
import categorisationRouter from './routes/categorisation.js';
import portefeuillesRouter from './routes/portefeuilles.js';
import dataRouter from './routes/data.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/upload', authMiddleware, uploadRouter);
app.use('/api/analysis', authMiddleware, analysisRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/categorisation', authMiddleware, categorisationRouter);
app.use('/api/portefeuilles', authMiddleware, portefeuillesRouter);
app.use('/api/data', authMiddleware, dataRouter);
app.get('/api/ping', (req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`Backend démarré sur http://localhost:${port}`);
});
