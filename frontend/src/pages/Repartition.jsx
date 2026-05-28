import { Fragment, useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchRepartition } from '../api.js';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1', '#14b8a6',
];
const COLOR_NONE = '#cbd5e1';

function formatAmount(v) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function PieChart({ slices, title, onSelect, selectedKey }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  const W = 300, H = 300;
  const cx = 150, cy = 150, r = 110;

  const total = slices.reduce((s, d) => s + d.total, 0);

  if (total === 0) {
    return (
      <div style={{ flex: 1, minWidth: 260, textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>{title}</h3>
        <p style={{ color: '#94a3b8' }}>Aucune donnée</p>
      </div>
    );
  }

  let colorIdx = 0;
  let currentAngle = -Math.PI / 2;
  const computed = slices.map((slice) => {
    const pct = slice.total / total;
    const angle = pct * 2 * Math.PI;
    const startAngle = currentAngle;
    // Clamp to avoid degenerate arc when pct ≈ 1
    const drawAngle = Math.min(angle, 2 * Math.PI - 0.0001);
    currentAngle += angle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(startAngle + drawAngle);
    const y2 = cy + r * Math.sin(startAngle + drawAngle);
    const largeArc = drawAngle > Math.PI ? 1 : 0;
    const path = `M ${cx},${cy} L ${x1.toFixed(2)},${y1.toFixed(2)} A ${r},${r} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;

    const midAngle = startAngle + drawAngle / 2;
    const labelR = r * 0.62;

    const color = slice.portefeuille_id === null ? COLOR_NONE : COLORS[colorIdx++ % COLORS.length];
    const key = slice.portefeuille_id ?? 'none';

    return { ...slice, path, midAngle, labelX: cx + labelR * Math.cos(midAngle), labelY: cy + labelR * Math.sin(midAngle), pct, color, key };
  });

  const handleMouseMove = (e, slice) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, slice });
  };

  const isAllSelected = selectedKey === undefined;

  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', textAlign: 'center' }}>{title}</h3>

      <div ref={containerRef} style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setTooltip(null)}
        >
          {slices.length === 1 ? (
            <circle
              cx={cx} cy={cy} r={r}
              fill={computed[0].color}
              stroke="#fff" strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => handleMouseMove(e, computed[0])}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onSelect(computed[0].key)}
            />
          ) : (
            computed.map((slice) => (
              <path
                key={slice.key}
                d={slice.path}
                fill={slice.color}
                stroke="#fff"
                strokeWidth="2"
                opacity={isAllSelected || selectedKey === slice.key ? 1 : 0.35}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseMove={(e) => handleMouseMove(e, slice)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => onSelect(slice.key)}
              />
            ))
          )}

          {computed.map((slice) =>
            slice.pct > 0.07 ? (
              <g key={`label-${slice.key}`} style={{ pointerEvents: 'none' }}>
                <text x={slice.labelX} y={slice.labelY - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">
                  {formatAmount(slice.total)}
                </text>
                <text x={slice.labelX} y={slice.labelY + 8} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.85)">
                  {(slice.pct * 100).toFixed(1)}%
                </text>
              </g>
            ) : null
          )}
        </svg>

        {tooltip && (
          <div style={{
            position: 'absolute',
            left: tooltip.x + 14,
            top: tooltip.y - 12,
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: '0.8rem',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontWeight: 600 }}>{tooltip.slice.portefeuille_nom}</div>
            <div>{formatAmount(tooltip.slice.total)} — {(tooltip.slice.pct * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      {/* Légende */}
      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {computed.map((slice) => (
          <div
            key={slice.key}
            onClick={() => onSelect(slice.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.82rem', cursor: 'pointer',
              opacity: isAllSelected || selectedKey === slice.key ? 1 : 0.45,
              transition: 'opacity 0.15s',
            }}
          >
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: slice.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#475569' }}>{slice.portefeuille_nom}</span>
            <span style={{ color: '#64748b' }}>{(slice.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperationsTable({ operations, title }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="card table-card" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>{title}</h3>
      {operations.length === 0 ? (
        <p style={{ color: '#64748b' }}>Aucune opération.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Catégorie</th>
              <th style={{ textAlign: 'right' }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op) => (
              <Fragment key={op.id}>
                <tr
                  onClick={() => toggle(op.id)}
                  className={expandedId === op.id ? 'row-selected' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{op.date}</td>
                  <td>{op.libelle}</td>
                  <td>{op.categorie}</td>
                  <td style={{ textAlign: 'right' }}>{formatAmount(op.montant)}</td>
                </tr>
                {expandedId === op.id && (
                  <tr>
                    <td colSpan={4} style={{ background: '#f8fafc', padding: '0.6rem 1rem', fontSize: '0.84rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem 2rem', color: '#475569' }}>
                        <div><strong>Date :</strong> {op.date}</div>
                        <div><strong>Montant :</strong> {formatAmount(op.montant)}</div>
                        <div><strong>Catégorie :</strong> {op.categorie}</div>
                        <div style={{ gridColumn: '1 / -1' }}><strong>Libellé :</strong> {op.libelle}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Repartition() {
  const { month } = useOutletContext();
  const [data, setData] = useState({ depenses: [], recettes: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // { type: 'depense'|'recette', portKey }

  useEffect(() => {
    setLoading(true);
    setError('');
    setSelected(null);
    fetchRepartition(month || undefined)
      .then((res) => setData(res.data))
      .catch(() => setError('Erreur lors du chargement.'))
      .finally(() => setLoading(false));
  }, [month]);

  const handleSelect = (type, portKey) => {
    setSelected((prev) =>
      prev && prev.type === type && prev.portKey === portKey ? null : { type, portKey }
    );
  };

  const selectedSlice = selected
    ? (selected.type === 'depense' ? data.depenses : data.recettes)
        .find((s) => (s.portefeuille_id ?? 'none') === selected.portKey)
    : null;

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <>
          <div className="card">
            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'flex-start' }}>
              <PieChart
                slices={data.depenses}
                title="Dépenses par portefeuille"
                onSelect={(k) => handleSelect('depense', k)}
                selectedKey={selected?.type === 'depense' ? selected.portKey : undefined}
              />
              <PieChart
                slices={data.recettes}
                title="Recettes par portefeuille"
                onSelect={(k) => handleSelect('recette', k)}
                selectedKey={selected?.type === 'recette' ? selected.portKey : undefined}
              />
            </div>
          </div>

          {selectedSlice && (
            <OperationsTable
              operations={selectedSlice.operations}
              title={`Opérations — ${selectedSlice.portefeuille_nom}`}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Repartition;
