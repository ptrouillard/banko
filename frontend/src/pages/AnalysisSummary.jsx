import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchSummary } from '../api.js';
import { useTranslation } from '../i18n.js';

function PieChart({ debit, credit }) {
  const total = debit + credit;
  if (total === 0) return null;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const debitRatio = debit / total;

  function polarToCartesian(angle) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startAngle, endAngle, color) {
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    return (
      <path
        d={`M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`}
        fill={color} stroke="#fff" strokeWidth={2}
      />
    );
  }

  const debitEnd = debitRatio * 360;
  const onlyDebit = credit === 0;
  const onlyCredit = debit === 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {onlyDebit && <circle cx={cx} cy={cy} r={r} fill="#e05252" />}
        {onlyCredit && <circle cx={cx} cy={cy} r={r} fill="#52a852" />}
        {!onlyDebit && !onlyCredit && (
          <>{arcPath(0, debitEnd, '#e05252')}{arcPath(debitEnd, 360, '#52a852')}</>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 14, height: 14, background: '#e05252', display: 'inline-block', borderRadius: 3 }} />
          <span>Dépenses : <strong>{debit.toFixed(2)} €</strong> ({(debitRatio * 100).toFixed(1)} %)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 14, height: 14, background: '#52a852', display: 'inline-block', borderRadius: 3 }} />
          <span>Recettes : <strong>{credit.toFixed(2)} €</strong> ({((1 - debitRatio) * 100).toFixed(1)} %)</span>
        </div>
      </div>
    </div>
  );
}

function AnalysisSummary() {
  const { t } = useTranslation();
  const { month } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSummary(month || undefined)
      .then((res) => setSummary(res.data))
      .catch(() => setError(t('fetchMonthDataError')));
  }, [month, t]);

  const pieData = useMemo(() =>
    summary ? { debit: summary.total_debit, credit: summary.total_credit } : null,
    [summary]
  );

  return (
    <div className="card summary-card">
      <h3>{t('summaryTitle')}</h3>
      {error && <div className="error">{error}</div>}
      {pieData && <PieChart debit={pieData.debit} credit={pieData.credit} />}
      {pieData && pieData.debit === 0 && pieData.credit === 0 && (
        <p style={{ color: '#64748b' }}>Aucune donnée pour cette période.</p>
      )}
    </div>
  );
}

export default AnalysisSummary;
