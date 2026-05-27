import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchExpenses } from '../api.js';
import { useTranslation } from '../i18n.js';

function AnalysisDepenses() {
  const { t } = useTranslation();
  const { month } = useOutletContext();
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExpenses(month || undefined)
      .then((res) => setExpenses(res.data))
      .catch(() => setError(t('fetchMonthDataError')));
  }, [month, t]);

  const total = useMemo(() => expenses.reduce((s, r) => s + r.amount, 0), [expenses]);

  return (
    <div className="card table-card">
      <h3>{t('expensesTable')}</h3>
      {error && <div className="error">{error}</div>}
      {expenses.length === 0 ? (
        <p style={{ color: '#64748b' }}>Aucune dépense.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>{t('libelle')}</th>
              <th style={{ textAlign: 'right' }}>{t('amount')}</th>
              <th>{t('category')}</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.libelle}</td>
                <td style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 500 }}>
                  -{row.amount.toFixed(2)} €
                </td>
                <td>{row.categorie || <em style={{ color: '#94a3b8' }}>—</em>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={2}>Total dépenses</td>
              <td style={{ textAlign: 'right', color: '#b91c1c' }}>-{total.toFixed(2)} €</td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

export default AnalysisDepenses;
