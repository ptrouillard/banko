import { useState, useEffect } from 'react';
import { fetchEvolution, fetchPortefeuilles } from '../api.js';

function formatAmount(v) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function formatLabel(label, granularity) {
  if (granularity === 'month') {
    const [y, m] = label.split('-');
    return `${m}/${y.slice(2)}`;
  }
  const parts = label.split('-');
  return `${parts[2]}/${parts[1]}`;
}

function variationColor(variation, type) {
  if (variation === null) return '#94a3b8';
  const stable = Math.abs(variation) < 1;
  if (stable) return '#f59e0b';
  const up = variation > 0;
  // dépenses : hausse = mauvais (rouge), baisse = bon (vert)
  // recettes : hausse = bon (vert), baisse = mauvais (rouge)
  return (type === 'depense' ? up : !up) ? '#ef4444' : '#22c55e';
}

function EvolutionChart({ points, granularity, variation, type }) {
  const W = 800, H = 260;
  const PAD = { top: 20, right: 20, bottom: 48, left: 76 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const chartTop = PAD.top;
  const chartBottom = PAD.top + cH;

  if (points.length === 0) {
    return (
      <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>
        Aucune donnée pour ce portefeuille.
      </p>
    );
  }

  const data = points.length === 1 ? [points[0], points[0]] : points;
  const maxVal = Math.max(...data.map((d) => d.total));
  const topVal = maxVal * 1.1 || 100;

  const xScale = (i) => PAD.left + (i / (data.length - 1)) * cW;
  const yScale = (v) => chartBottom - (v / topVal) * cH;

  const avg = data.reduce((s, d) => s + d.total, 0) / data.length;
  const avgY = yScale(avg);

  const pts = data.map((d, i) => ({ x: xScale(i), y: yScale(d.total) }));
  const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${pts[0].x},${pts[0].y}`,
    ...pts.slice(1).map((p) => `L ${p.x},${p.y}`),
    `L ${pts[pts.length - 1].x},${chartBottom}`,
    `L ${pts[0].x},${chartBottom}`,
    'Z',
  ].join(' ');

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const v = (topVal / 4) * i;
    return { y: yScale(v), v };
  });

  const step = Math.max(1, Math.floor(data.length / 8));
  const xLabels = data.reduce((acc, d, i) => {
    if (i % step === 0 || i === data.length - 1) acc.push({ d, i });
    return acc;
  }, []);

  const vColor = variationColor(variation, type);
  const vSign = variation === null ? '' : variation > 0 ? '+' : '';
  const vIcon = variation === null ? '—' : Math.abs(variation) < 1 ? '→' : variation > 0 ? '↑' : '↓';
  const vText = variation === null ? '—' : `${vSign}${variation.toFixed(1)}%`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Évolution sur la période</span>
        <span style={{
          fontSize: '1rem', fontWeight: 700, color: vColor,
          background: `${vColor}1a`, padding: '3px 12px', borderRadius: 99,
        }}>
          {vIcon} {vText}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {gridLines.map(({ y, v }, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {formatAmount(v)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="rgba(99,102,241,0.1)" />

        {/* Moyenne */}
        <line x1={PAD.left} y1={avgY} x2={PAD.left + cW} y2={avgY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4" />
        <text x={PAD.left + cW - 4} y={avgY - 5} textAnchor="end" fontSize="10" fill="#f59e0b" fontWeight="600">
          moy. {formatAmount(avg)}
        </text>

        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.length <= 30 && pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#6366f1" />
        ))}

        {xLabels.map(({ d, i }) => {
          const x = xScale(i);
          return (
            <text
              key={i}
              x={x}
              y={chartBottom + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
              transform={`rotate(-30, ${x}, ${chartBottom + 14})`}
            >
              {formatLabel(d.label, granularity)}
            </text>
          );
        })}

        <rect x={PAD.left} y={chartTop} width={cW} height={cH} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      </svg>
    </div>
  );
}

function Evolution({ type }) {
  const title = type === 'depense' ? 'Évolution des dépenses' : 'Évolution des recettes';
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPortefeuilles()
      .then((res) => {
        setPortfolios(res.data);
        if (res.data.length > 0) setPortfolioId(String(res.data[0].id));
      })
      .catch(() => setError('Erreur lors du chargement des portefeuilles.'));
  }, []);

  useEffect(() => {
    if (!portfolioId) { setChartData(null); return; }
    setLoading(true);
    setError('');
    fetchEvolution(portfolioId, type)
      .then((res) => setChartData(res.data))
      .catch(() => setError('Erreur lors du chargement des données.'))
      .finally(() => setLoading(false));
  }, [portfolioId, type]);

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', whiteSpace: 'nowrap' }}>
            Portefeuille :
          </label>
          {portfolios.length === 0 ? (
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Aucun portefeuille créé.</span>
          ) : (
            <select value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)} style={{ flex: 1 }}>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {portfolioId && (
        <div className="card">
          {loading ? (
            <p>Chargement…</p>
          ) : chartData ? (
            <EvolutionChart
              points={chartData.points}
              granularity={chartData.granularity}
              variation={chartData.variation}
              type={type}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export function EvolutionDepenses() {
  return <Evolution type="depense" />;
}

export function EvolutionRecettes() {
  return <Evolution type="recette" />;
}
