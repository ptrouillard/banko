import { useEffect, useMemo, useState } from 'react';
import { fetchMonths, fetchSummary, fetchReceipts, fetchExpenses, updateCategory, fetchCategorySuggestions } from '../api.js';

function Analysis() {
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [summary, setSummary] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState({});

  useEffect(() => {
    fetchMonths().then((res) => setMonths(res.data)).catch(() => setError('Impossible de récupérer les mois')); 
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    Promise.all([fetchSummary(selectedMonth), fetchReceipts(selectedMonth), fetchExpenses(selectedMonth)])
      .then(([summaryRes, receiptsRes, expensesRes]) => {
        setSummary(summaryRes.data);
        setReceipts(receiptsRes.data);
        setExpenses(expensesRes.data);
      })
      .catch(() => setError('Erreur lors du chargement des données du mois'));
  }, [selectedMonth]);

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
      <h2>Analyse du budget</h2>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <label>Mois</label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="">Sélectionnez un mois</option>
          {months.map((month) => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      </div>

      {summary && (
        <div className="card summary-card">
          <h3>Recettes / Dépenses</h3>
          <div className="summary-row">
            <div>Dépenses&nbsp;: <strong>{summary.total_debit.toFixed(2)} €</strong></div>
            <div>Recettes&nbsp;: <strong>{summary.total_credit.toFixed(2)} €</strong></div>
          </div>
          <div className="chart-placeholder">
            <div>Graphique camembert disponible ici plus tard</div>
          </div>
        </div>
      )}

      <div className="card table-card">
        <h3>Répartition recettes</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>Libellé</th><th>Montant</th></tr>
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
        <h3>Répartition dépenses</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>Libellé</th><th>Montant</th><th>Catégorie</th></tr>
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
