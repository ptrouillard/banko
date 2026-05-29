import { useState, useEffect, useCallback } from 'react';
import { fetchCashflow } from '../api.js';

const PERIODS = [
  { key: '1m',  label: '1 mois' },
  { key: '3m',  label: '3 mois' },
  { key: '6m',  label: '6 mois' },
  { key: '1y',  label: '1 an' },
  { key: 'all', label: 'Depuis toujours' },
];

function formatAmount(v) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function formatLabel(label, granularity) {
  if (granularity === 'month') {
    const [y, m] = label.split('-');
    return `${m}/${y.slice(2)}`;
  }
  // day or week: YYYY-MM-DD
  const parts = label.split('-');
  return `${parts[2]}/${parts[1]}`;
}

function CashflowChart({ points, currentBalance, granularity }) {
  const W = 800, H = 300;
  const PAD = { top: 20, right: 20, bottom: 48, left: 76 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const chartTop = PAD.top;
  const chartBottom = PAD.top + cH;

  // Compute start balance by working backwards from current balance
  const periodNet = points.reduce((s, p) => s + p.net, 0);
  const startBalance = currentBalance - periodNet;

  let running = startBalance;
  const data = points.map(({ label, net }) => {
    running += net;
    return { label, balance: Math.round(running * 100) / 100 };
  });

  if (data.length === 0) {
    return <p style={{ color: '#64748b', padding: '2rem 0', textAlign: 'center' }}>Aucune opération dans cette période.</p>;
  }
  if (data.length === 1) {
    data.push({ ...data[0] }); // need at least 2 points to draw a line
  }

  const balances = data.map(d => d.balance);
  const dataMin = Math.min(0, ...balances);
  const dataMax = Math.max(0, ...balances);
  const range = dataMax - dataMin;
  const pad = range * 0.08 || 100;
  const minB = dataMin - pad;
  const maxB = dataMax + pad;
  const totalRange = maxB - minB;

  const xScale = (i) => PAD.left + (i / (data.length - 1)) * cW;
  const yScale = (v) => chartTop + ((maxB - v) / totalRange) * cH;

  const zeroY = yScale(0);
  const aboveH = Math.max(0, zeroY - chartTop);
  const belowH = Math.max(0, chartBottom - zeroY);

  const pts = data.map((d, i) => ({ x: xScale(i), y: yScale(d.balance) }));
  const polylinePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${pts[0].x},${pts[0].y}`,
    ...pts.slice(1).map(p => `L ${p.x},${p.y}`),
    `L ${pts[pts.length - 1].x},${zeroY}`,
    `L ${pts[0].x},${zeroY}`,
    'Z',
  ].join(' ');

  // Y axis: 5 evenly spaced gridlines
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const v = minB + (totalRange / 4) * i;
    return { y: yScale(v), v };
  });

  // X axis: at most 8 labels
  const maxXLabels = 8;
  const step = Math.max(1, Math.floor(data.length / maxXLabels));
  const xLabels = data.reduce((acc, d, i) => {
    if (i % step === 0 || i === data.length - 1) acc.push({ d, i });
    return acc;
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
        <span>Solde en début de période : <strong style={{ color: startBalance < 0 ? '#b91c1c' : '#166534' }}>{formatAmount(startBalance)}</strong></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <clipPath id="cf-above">
            <rect x={PAD.left} y={chartTop} width={cW} height={aboveH} />
          </clipPath>
          <clipPath id="cf-below">
            <rect x={PAD.left} y={zeroY} width={cW} height={belowH} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {gridLines.map(({ y, v }, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{formatAmount(v)}</text>
          </g>
        ))}

        {/* Area fills — green above zero, red below zero */}
        <path d={areaPath} fill="rgba(34,197,94,0.15)" clipPath="url(#cf-above)" />
        <path d={areaPath} fill="rgba(239,68,68,0.18)" clipPath="url(#cf-below)" />

        {/* Zero baseline */}
        <line x1={PAD.left} y1={zeroY} x2={PAD.left + cW} y2={zeroY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />

        {/* Balance line */}
        <polyline points={polylinePoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* X axis labels */}
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

        {/* Chart border */}
        <rect x={PAD.left} y={chartTop} width={cW} height={cH} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      </svg>
    </div>
  );
}

function SuiviFlux() {
  const [period, setPeriod] = useState('3m');
  const [points, setPoints] = useState([]);
  const [granularity, setGranularity] = useState('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentBalance, setCurrentBalance] = useState(
    () => parseFloat(localStorage.getItem('banko_current_balance') || '0')
  );
  const [balanceInput, setBalanceInput] = useState(
    () => localStorage.getItem('banko_current_balance') || '0'
  );

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchCashflow(period)
      .then((res) => {
        setPoints(res.data.points);
        setGranularity(res.data.granularity);
      })
      .catch(() => setError('Erreur lors du chargement des données.'))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const commitBalance = () => {
    const val = parseFloat(String(balanceInput).replace(',', '.')) || 0;
    setCurrentBalance(val);
    localStorage.setItem('banko_current_balance', String(val));
  };

  return (
    <div className="page">
      <h2>Suivi du flux</h2>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Solde actuel :
          </label>
          <input
            type="text"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            onBlur={commitBalance}
            onKeyDown={(e) => e.key === 'Enter' && commitBalance()}
            style={{ width: '140px', textAlign: 'right' }}
            placeholder="0"
          />
          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>€ — solde du compte tel qu'affiché dans votre appli bancaire aujourd'hui</span>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={period === key ? '' : 'secondary'}
              style={{ fontSize: '0.85rem' }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <p>Chargement…</p>
        ) : (
          <CashflowChart points={points} currentBalance={currentBalance} granularity={granularity} />
        )}
      </div>
    </div>
  );
}

export default SuiviFlux;
