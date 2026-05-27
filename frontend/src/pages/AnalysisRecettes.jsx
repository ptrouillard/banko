import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchReceipts } from '../api.js';
import { useTranslation } from '../i18n.js';

function AnalysisRecettes() {
  const { t } = useTranslation();
  const { month } = useOutletContext();
  const [receipts, setReceipts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReceipts(month || undefined)
      .then((res) => setReceipts(res.data))
      .catch(() => setError(t('fetchMonthDataError')));
  }, [month, t]);

  const total = useMemo(() => receipts.reduce((s, r) => s + r.amount, 0), [receipts]);

  return (
    <div className="card table-card">
      <h3>{t('receiptsTable')}</h3>
      {error && <div className="error">{error}</div>}
      {receipts.length === 0 ? (
        <p style={{ color: '#64748b' }}>Aucune recette.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>{t('libelle')}</th>
              <th style={{ textAlign: 'right' }}>{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.libelle}</td>
                <td style={{ textAlign: 'right', color: '#166534', fontWeight: 500 }}>
                  +{row.amount.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={2}>Total recettes</td>
              <td style={{ textAlign: 'right', color: '#166534' }}>+{total.toFixed(2)} €</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

export default AnalysisRecettes;
