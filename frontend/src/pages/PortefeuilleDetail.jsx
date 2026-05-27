import { useEffect, useState } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { fetchPortefeuilleDetail } from '../api.js';
import { formatMonthLabel } from './Analysis.jsx';

const TYPE_LABELS = { depense: 'Dépenses', recette: 'Recettes' };

function PortefeuilleDetail() {
  const { id } = useParams();
  const { month } = useOutletContext();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPortefeuilleDetail(id, month || undefined)
      .then((res) => setDetail(res.data))
      .catch(() => setError('Erreur lors du chargement du portefeuille'))
      .finally(() => setLoading(false));
  }, [id, month]);

  if (loading) return <p>Chargement…</p>;
  if (!detail) return null;

  const { portefeuille, categories, operations, total_debit, total_credit } = detail;
  const scope = month ? formatMonthLabel(month) : 'Toutes les données';

  return (
    <div>
      <div className="page-header-row" style={{ marginBottom: '1rem' }}>
        <button className="btn-back" onClick={() => navigate('/analysis/portefeuilles')}>← Portefeuilles</button>
        <h3 style={{ margin: 0 }}>{portefeuille.nom}</h3>
        {portefeuille.permanent && <span className="badge-auto">Automatique</span>}
        <span className="portefeuille-scope">{scope}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="portefeuille-detail-header">
          <h3>Catégories</h3>
          <div className="portefeuille-totaux">
            {total_debit > 0 && <span className="total-chip total-chip--debit">{total_debit.toFixed(2)} € dépenses</span>}
            {total_credit > 0 && <span className="total-chip total-chip--credit">{total_credit.toFixed(2)} € recettes</span>}
          </div>
        </div>

        {categories.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            {portefeuille.permanent
              ? 'Aucune catégorie récurrente détectée (2 mois minimum nécessaires).'
              : 'Aucune catégorie dans ce portefeuille.'}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Catégorie</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Dépenses</th>
                <th style={{ textAlign: 'right' }}>Recettes</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.libelle}</td>
                  <td>{TYPE_LABELS[cat.type] || <em style={{ opacity: 0.5 }}>—</em>}</td>
                  <td style={{ textAlign: 'right' }}>{cat.total_debit > 0 ? `${cat.total_debit.toFixed(2)} €` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{cat.total_credit > 0 ? `${cat.total_credit.toFixed(2)} €` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card table-card">
        <h3>Opérations</h3>
        {operations.length === 0 ? (
          <p style={{ color: '#64748b' }}>Aucune opération.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th style={{ textAlign: 'right' }}>Débit</th>
                <th style={{ textAlign: 'right' }}>Crédit</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => (
                <tr key={op.id}>
                  <td>{op.date}</td>
                  <td>{op.libelle}</td>
                  <td>{op.categorie_nom}</td>
                  <td style={{ textAlign: 'right' }}>{op.debit > 0 ? `${op.debit.toFixed(2)} €` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{op.credit > 0 ? `${op.credit.toFixed(2)} €` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default PortefeuilleDetail;
