import { useEffect, useState } from 'react';
import {
  fetchCategorisationStats,
  fetchUncategorized,
  applyCategory,
  fetchCategories,
} from '../api.js';

function CategoriModal({ operation, onClose, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories().then((res) => {
      const all = res.data;
      const libelle = operation.libelle.toUpperCase();
      const matching = all.filter(
        (c) => c.pattern && libelle.includes(c.pattern.toUpperCase())
      );
      setCategories(matching);
      if (matching.length === 0) setShowNew(true);
    });
  }, [operation.libelle]);

  const handleSelectCategory = (cat) => {
    setSelectedId(cat.id);
    setKeyword(cat.pattern || '');
    setShowNew(false);
    setNewName('');
    setError('');
  };

  const handleSave = async () => {
    if (!selectedId && !showNew) {
      setError('Veuillez sélectionner une catégorie.');
      return;
    }
    if (showNew && !newName.trim()) {
      setError('Le nom de la catégorie est requis.');
      return;
    }
    if (!keyword.trim()) {
      setError('Le mot clé significatif est requis.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await applyCategory({
        operation_id: operation.id,
        categorie_id: showNew ? null : selectedId,
        new_category_name: showNew ? newName.trim() : null,
        keyword: keyword.trim(),
        type: showNew ? (newType || null) : null,
      });
      onSaved(res.data);
    } catch {
      setError("Erreur lors de la catégorisation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <h3>Catégoriser l'opération</h3>
        <div className="modal-libelle">
          <span className="modal-libelle-label">Libellé</span>
          <strong>{operation.libelle}</strong>
        </div>

        {categories.length > 0 && (
          <div className="modal-section">
            <p className="modal-section-title">Catégories correspondantes</p>
            <ul className="category-suggestions">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className={`category-suggestion-item${selectedId === cat.id && !showNew ? ' selected' : ''}`}
                  onClick={() => handleSelectCategory(cat)}
                >
                  <span>{cat.libelle}</span>
                  <em className="pattern-chip">{cat.pattern}</em>
                </li>
              ))}
            </ul>
            <button
              className="link-button"
              style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
              onClick={() => { setShowNew(true); setSelectedId(null); setKeyword(''); }}
            >
              + Créer une nouvelle catégorie
            </button>
          </div>
        )}

        {categories.length === 0 && (
          <p className="modal-no-match">
            Aucune catégorie ne correspond à ce libellé. Créez-en une ci-dessous.
          </p>
        )}

        {showNew && (
          <div className="modal-section">
            {categories.length > 0 && <p className="modal-section-title">Nouvelle catégorie</p>}
            <label>Nom de la catégorie</label>
            <input
              type="text"
              placeholder="ex : Courses"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <label>Type</label>
            <div className="type-radio-group">
              {[['depense', 'Dépenses'], ['recette', 'Recettes'], ['', '—']].map(([val, label]) => (
                <label key={val} className="type-radio">
                  <input
                    type="radio"
                    name="new-cat-type"
                    value={val}
                    checked={newType === val}
                    onChange={() => setNewType(val)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {(showNew || selectedId) && (
          <div className="modal-section">
            <label>Mot clé significatif</label>
            <input
              type="text"
              placeholder="ex : LECLERC"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <p className="modal-hint">
              Toutes les opérations contenant ce mot clé seront catégorisées automatiquement.
            </p>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={saving}>Annuler</button>
          <button onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde…' : 'Sauver'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Categorisation() {
  const [stats, setStats] = useState({ categorized: 0, uncategorized: 0 });
  const [operations, setOperations] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [modalOp, setModalOp] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStats = () => {
    fetchCategorisationStats().then((res) => setStats(res.data)).catch(() => {});
  };

  const loadPage = (p) => {
    setLoading(true);
    setError('');
    fetchUncategorized(p)
      .then((res) => {
        setOperations(res.data.rows);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
        setPage(res.data.page);
        setSelectedId(null);
      })
      .catch(() => setError('Erreur lors du chargement des opérations.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
    loadPage(1);
  }, []);

  const handleRowClick = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setLastResult(null);
  };

  const handleCategoriser = () => {
    const op = operations.find((o) => o.id === selectedId);
    if (op) setModalOp(op);
  };

  const handleSaved = (result) => {
    setModalOp(null);
    setLastResult(result);
    setSelectedId(null);
    loadStats();
    loadPage(page);
  };

  const selectedOp = operations.find((o) => o.id === selectedId);

  return (
    <div className="page">
      <h2>Catégorisation des opérations</h2>

      <div className="card stats-bar">
        <div className="stat-item">
          <span className="stat-value">{stats.categorized}</span>
          <span className="stat-label">catégorisées</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">{stats.uncategorized}</span>
          <span className="stat-label">à catégoriser</span>
        </div>
      </div>

      {lastResult && (
        <div className="card result-banner">
          ✓ {lastResult.applied} opération{lastResult.applied > 1 ? 's' : ''} catégorisée{lastResult.applied > 1 ? 's' : ''} avec « {lastResult.categorie} »
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card table-card">
        <div className="table-toolbar">
          <span>{total} opération{total > 1 ? 's' : ''} à catégoriser</span>
          {selectedId && (
            <button onClick={handleCategoriser}>Catégoriser</button>
          )}
        </div>

        {loading ? (
          <p>Chargement…</p>
        ) : operations.length === 0 ? (
          <p>Toutes les opérations sont catégorisées.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th style={{ textAlign: 'right' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => {
                  const debit = Number(op.debit) || 0;
                  const credit = Number(op.credit) || 0;
                  return (
                    <tr
                      key={op.id}
                      className={selectedId === op.id ? 'row-selected' : ''}
                      onClick={() => handleRowClick(op.id)}
                      onDoubleClick={() => { setSelectedId(op.id); setLastResult(null); setModalOp(op); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{op.date}</td>
                      <td>{op.libelle}</td>
                      <td style={{ textAlign: 'right' }}>
                        {debit > 0
                          ? <span style={{ color: '#b91c1c' }}>-{debit.toFixed(2)} €</span>
                          : credit > 0
                            ? <span style={{ color: '#166534' }}>+{credit.toFixed(2)} €</span>
                            : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="pagination">
              <button onClick={() => loadPage(page - 1)} disabled={page <= 1}>‹ Précédent</button>
              <span>Page {page} / {totalPages}</span>
              <button onClick={() => loadPage(page + 1)} disabled={page >= totalPages}>Suivant ›</button>
            </div>
          </>
        )}
      </div>

      {modalOp && (
        <CategoriModal
          operation={modalOp}
          onClose={() => setModalOp(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

export default Categorisation;
