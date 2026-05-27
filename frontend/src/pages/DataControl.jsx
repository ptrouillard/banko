import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const PAGE_SIZE = 50;

function DataControl() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      const res = await api.get('/data', { params });
      setRows(res.data.rows);
      setTotal(res.data.total);
    } catch {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleDeleteAll = async () => {
    try {
      await api.delete('/data/all');
      setRows([]);
      setTotal(0);
      setPage(1);
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setShowConfirm(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette ligne ?')) return;
    try {
      await api.delete(`/data/${id}`);
      setRows((current) => current.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Contrôle des données</h2>
        <button style={{ background: '#b91c1c' }} onClick={() => setShowConfirm(true)}>
          Vider les opérations importées
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label>Recherche (libellé ou date)</label>
          <input
            type="text"
            placeholder="ex : LECLERC ou 2026-01"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ width: 260 }}
          />
        </div>
        <button onClick={handleSearch}>Chercher</button>
        {search && (
          <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
            Effacer
          </button>
        )}
        <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: '0.9rem' }}>
          {total} ligne{total !== 1 ? 's' : ''} au total
        </span>
      </div>

      {showConfirm && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <h3 style={{ color: '#b91c1c' }}>Attention</h3>
            <p style={{ margin: 0 }}>
              Cette opération efface <strong>toutes les opérations importées</strong> de manière irréversible.
            </p>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowConfirm(false)}>Annuler</button>
              <button style={{ background: '#b91c1c' }} onClick={handleDeleteAll}>Continuer</button>
            </div>
          </div>
        </div>
      )}


      <div className="card table-card" style={{ overflowX: 'auto' }}>
        {loading
          ? <p>Chargement…</p>
          : rows.length === 0
            ? <p>Aucune donnée trouvée.</p>
            : (
              <table style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Libellé</th>
                    <th>Débit</th>
                    <th>Crédit</th>
                    <th>Catégorie</th>
                    <th>Importé le</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ opacity: 0.4, fontSize: '0.8rem' }}>{row.id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.date}</td>
                      <td>{row.libelle}</td>
                      <td style={{ textAlign: 'right', color: row.debit > 0 ? '#c0392b' : 'inherit' }}>
                        {row.debit > 0 ? `${row.debit.toFixed(2)} €` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: row.credit > 0 ? '#27ae60' : 'inherit' }}>
                        {row.credit > 0 ? `${row.credit.toFixed(2)} €` : '—'}
                      </td>
                      <td>{row.categorie || <em style={{ opacity: 0.4 }}>—</em>}</td>
                      <td style={{ opacity: 0.5, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {row.date_import ? row.date_import.slice(0, 10) : '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(row.id)}
                          style={{ color: '#c0392b', padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>

      {totalPages > 1 && (
        <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
          <span style={{ padding: '0 0.5rem' }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  );
}

export default DataControl;
