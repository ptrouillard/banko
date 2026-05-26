import { useEffect, useMemo, useState } from 'react';
import { fetchMonths, fetchSummary, fetchReceipts, fetchExpenses, updateCategory, fetchCategorySuggestions } from '../api.js';
import { useTranslation } from '../i18n.js';

function Analysis() {
  const { t } = useTranslation();
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
        const validMonths = Array.isArray(res.data) ? res.data.filter((month) => validMonthPattern.test(month)) : [];
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
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const d = new Date(Date.UTC(year, monthIndex, 1));
    const label = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const handleCategoryChange = async (id, value) => {
    if (value.length < 1) return;
    const updated = expenses.map((item) => (item.id === id ? { ...item, categorie: value } : item));
    setExpenses(updated);
    if (value.length >= 3) {
      const response = await fetchCategorySuggestions(value);
      setSuggestions((current) => ({ ...current, [id]: response.data }));
    }
  };

  const saveCategory = async (id, categorie) => {
    if (!categorie) return;
    await updateCategory(id, categorie);
  };

  const pieData = useMemo(() => {
    if (!summary) return null;
    return [
      { label: 'Dépenses', value: summary.total_debit },
      { label: 'Recettes', value: summary.total_credit },
    ];
  }, [summary]);

  return (
    <div className="page">
      <h2>{t('analysis')}</h2>
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

      {summary && (
        <div className="card summary-card">
          <h3>{t('summaryTitle')}</h3>
          <div className="summary-row">
            <div>{t('expenses')}&nbsp;: <strong>{summary.total_debit.toFixed(2)} €</strong></div>
            <div>{t('receipts')}&nbsp;: <strong>{summary.total_credit.toFixed(2)} €</strong></div>
          </div>
          <div className="chart-placeholder">
            <div>{t('chartPlaceholder')}</div>
          </div>
        </div>
      )}

      <div className="card table-card">
        <h3>{t('receiptsTable')}</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>{t('libelle') || 'Libellé'}</th><th>{t('amount') || 'Montant'}</th></tr>
          </thead>
          <tbody>
            {receipts.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.libelle}</td>
                <td>{row.amount.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-card">
        <h3>{t('expensesTable')}</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>{t('libelle') || 'Libellé'}</th><th>{t('amount') || 'Montant'}</th><th>{t('category')}</th></tr>
          </thead>
          <tbody>
            {expenses.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.libelle}</td>
                <td>{row.amount.toFixed(2)} €</td>
                <td>
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
                            await saveCategory(row.id, suggestion);
                            setExpenses((current) => current.map((item) => item.id === row.id ? { ...item, categorie: suggestion } : item));
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
        </table>
      </div>
    </div>
  );
}

export default Analysis;
