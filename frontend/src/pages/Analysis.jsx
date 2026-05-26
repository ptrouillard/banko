import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  fetchMonths, fetchSummary, fetchReceipts, fetchExpenses,
  updateCategory, fetchCategorySuggestions,
} from '../api.js';
import { useTranslation } from '../i18n.js';

// Camembert SVG simple sans dépendance externe
function PieChart({ debit, credit }) {
  const total = debit + credit;
  if (total === 0) return null;

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;

  const debitRatio = debit / total;
  const creditRatio = credit / total;

  // Calcul des arcs SVG
  function polarToCartesian(angle) {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arcPath(startAngle, endAngle, color) {
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    return (
      <path
        d={`M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
      />
    );
  }

  const debitEnd = debitRatio * 360;
  // Si l'un des deux est 0, on affiche un cercle plein
  const showOnlyDebit = creditRatio === 0;
  const showOnlyCredit = debitRatio === 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {showOnlyDebit && <circle cx={cx} cy={cy} r={r} fill="#e05252" />}
        {showOnlyCredit && <circle cx={cx} cy={cy} r={r} fill="#52a852" />}
        {!showOnlyDebit && !showOnlyCredit && (
          <>
            {arcPath(0, debitEnd, '#e05252')}
            {arcPath(debitEnd, 360, '#52a852')}
          </>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 14, height: 14, background: '#e05252', display: 'inline-block', borderRadius: 3 }} />
          <span>Dépenses : <strong>{debit.toFixed(2)} €</strong> ({(debitRatio * 100).toFixed(1)} %)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 14, height: 14, background: '#52a852', display: 'inline-block', borderRadius: 3 }} />
          <span>Recettes : <strong>{credit.toFixed(2)} €</strong> ({(creditRatio * 100).toFixed(1)} %)</span>
        </div>
      </div>
    </div>
  );
}

function Analysis() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const view = pathname === '/analysis/depenses' ? 'depenses'
    : pathname === '/analysis/recettes' ? 'recettes'
    : 'summary';

  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [summary, setSummary] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState({});

  useEffect(() => {
    const validMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
    fetchMonths()
      .then((res) => {
        const validMonths = Array.isArray(res.data)
          ? res.data.filter((m) => validMonthPattern.test(m))
          : [];
        setMonths(validMonths);
        if (validMonths.length > 0) {
          setSelectedMonth((current) => current || validMonths[0]);
        }
      })
      .catch(() => setError(t('fetchMonthsError')));
  }, [t]);

  useEffect(() => {
    if (!selectedMonth) return;
    Promise.all([fetchSummary(selectedMonth), fetchReceipts(selectedMonth), fetchExpenses(selectedMonth)])
      .then(([summaryRes, receiptsRes, expensesRes]) => {
        setSummary(summaryRes.data);
        setReceipts(receiptsRes.data);
        setExpenses(expensesRes.data);
      })
      .catch(() => setError(t('fetchMonthDataError')));
  }, [selectedMonth, t]);

  const formatMonthLabel = (month) => {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) return month;
    const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    const label = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const handleCategoryChange = async (id, value) => {
    const updated = expenses.map((item) => (item.id === id ? { ...item, categorie: value } : item));
    setExpenses(updated);
    if (value.length >= 3) {
      const response = await fetchCategorySuggestions(value);
      setSuggestions((current) => ({ ...current, [id]: response.data }));
    } else {
      setSuggestions((current) => ({ ...current, [id]: [] }));
    }
  };

  const saveCategory = async (id, categorie) => {
    if (!categorie) return;
    await updateCategory(id, categorie);
    setSuggestions((current) => ({ ...current, [id]: [] }));
  };

  const pieData = useMemo(() => summary
    ? { debit: summary.total_debit, credit: summary.total_credit }
    : null, [summary]);

  const pageTitle = view === 'depenses' ? 'Dépenses'
    : view === 'recettes' ? 'Recettes'
    : t('analysis');

  return (
    <div className="page">
      <h2>{pageTitle}</h2>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <label>{t('selectMonth')}</label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="">{t('chooseMonth')}</option>
          {months.map((month) => (
            <option key={month} value={month}>{formatMonthLabel(month)}</option>
          ))}
        </select>
      </div>

      {view === 'summary' && summary && (
        <div className="card summary-card">
          <h3>{t('summaryTitle')}</h3>
          {pieData && <PieChart debit={pieData.debit} credit={pieData.credit} />}
        </div>
      )}

      {view === 'recettes' && (
        <div className="card table-card">
          <h3>{t('receiptsTable')}</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>{t('libelle') || 'Libellé'}</th>
                <th style={{ textAlign: 'right' }}>{t('amount') || 'Montant'}</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{row.libelle}</td>
                  <td style={{ textAlign: 'right' }}>{row.amount.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            {receipts.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan={2}>Total recettes</td>
                  <td style={{ textAlign: 'right' }}>
                    {receipts.reduce((sum, r) => sum + r.amount, 0).toFixed(2)} €
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {view === 'depenses' && (
        <div className="card table-card">
          <h3>{t('expensesTable')}</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>{t('libelle') || 'Libellé'}</th>
                <th style={{ textAlign: 'right' }}>{t('amount') || 'Montant'}</th>
                <th>{t('category')}</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{row.libelle}</td>
                  <td style={{ textAlign: 'right' }}>{row.amount.toFixed(2)} €</td>
                  <td style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={row.categorie || ''}
                      onChange={(e) => handleCategoryChange(row.id, e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          await saveCategory(row.id, row.categorie || '');
                        }
                      }}
                    />
                    {suggestions[row.id] && suggestions[row.id].length > 0 && (
                      <div className="suggestions">
                        {suggestions[row.id].map((suggestion) => (
                          <button
                            type="button"
                            key={suggestion}
                            onClick={async () => {
                              setExpenses((current) =>
                                current.map((item) =>
                                  item.id === row.id ? { ...item, categorie: suggestion } : item
                                )
                              );
                              await saveCategory(row.id, suggestion);
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan={2}>Total dépenses</td>
                  <td style={{ textAlign: 'right' }}>
                    {expenses.reduce((sum, r) => sum + r.amount, 0).toFixed(2)} €
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

export default Analysis;
