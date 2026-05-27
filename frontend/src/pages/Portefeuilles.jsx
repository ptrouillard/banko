import { useEffect, useState } from 'react';
import {
  fetchPortefeuilles,
  createPortefeuille,
  deletePortefeuille,
  deleteAllPortefeuilles,
  fetchCategories,
  fetchOrphanCategories,
  addCategoryToPortefeuille,
  removeCategoryFromPortefeuille,
} from '../api.js';

const TYPE_LABELS = { depense: 'Dépenses', recette: 'Recettes', interne: 'Interne' };

function PortefeuilleCard({ p, allCategories, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [cats, setCats] = useState([]);
  const [addCatId, setAddCatId] = useState('');
  const [error, setError] = useState('');

  const loadCats = async () => {
    const { fetchPortefeuilleDetail } = await import('../api.js');
    const detail = await fetchPortefeuilleDetail(p.id);
    setCats(detail.data.categories);
  };

  const handleExpand = async () => {
    if (!expanded) await loadCats();
    setExpanded((v) => !v);
  };

  const handleAdd = async () => {
    if (!addCatId) return;
    setError('');
    try {
      await addCategoryToPortefeuille(p.id, parseInt(addCatId));
      setAddCatId('');
      await loadCats();
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const handleRemove = async (catId) => {
    try {
      await removeCategoryFromPortefeuille(p.id, catId);
      await loadCats();
      onRefresh();
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  const assignedIds = new Set(cats.map((c) => c.id));
  const available = allCategories.filter((c) => !assignedIds.has(c.id));

  return (
    <div className="portefeuille-card" style={{ cursor: 'default' }}>
      <div className="portefeuille-card-header" style={{ cursor: 'pointer' }} onClick={handleExpand}>
        <span className="portefeuille-nom">{p.nom}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="portefeuille-meta">{p.nb_categories} catégorie{p.nb_categories !== 1 ? 's' : ''}</span>
          <button
            className="btn-icon-danger"
            onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
            title="Supprimer"
          >✕</button>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
          {error && <div className="error" style={{ marginBottom: '0.5rem' }}>{error}</div>}

          {cats.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>Aucune catégorie assignée.</p>
          ) : (
            <ul style={{ margin: '0 0 0.75rem', padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {cats.map((cat) => (
                <li key={cat.id} className="cat-tag">
                  <span>{cat.libelle}</span>
                  {cat.type && <em className="pattern-chip">{TYPE_LABELS[cat.type]}</em>}
                  <button onClick={() => handleRemove(cat.id)} title="Retirer" style={{ marginLeft: '0.3rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={addCatId} onChange={(e) => setAddCatId(e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }}>
              <option value="">Ajouter une catégorie…</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>{c.libelle}{c.type ? ` (${TYPE_LABELS[c.type]})` : ''}</option>
              ))}
            </select>
            <button onClick={handleAdd} disabled={!addCatId}>Ajouter</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Portefeuilles() {
  const [portefeuilles, setPortefeuilles] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [orphans, setOrphans] = useState({ count: 0, categories: [] });
  const [newNom, setNewNom] = useState('');
  const [error, setError] = useState('');
  const [showOrphans, setShowOrphans] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = async () => {
    const [pRes, cRes, oRes] = await Promise.all([
      fetchPortefeuilles(),
      fetchCategories(),
      fetchOrphanCategories(),
    ]);
    setPortefeuilles(pRes.data);
    setAllCategories(cRes.data);
    setOrphans(oRes.data);
  };

  useEffect(() => { load().catch(() => setError('Erreur lors du chargement')); }, []);

  const handleCreate = async () => {
    if (!newNom.trim()) return;
    setError('');
    try {
      await createPortefeuille(newNom.trim());
      setNewNom('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllPortefeuilles();
      setShowConfirm(false);
      load();
    } catch {
      setError('Erreur lors de la suppression');
      setShowConfirm(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce portefeuille ?')) return;
    try {
      await deletePortefeuille(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Gestion des portefeuilles</h2>
        <button style={{ background: '#b91c1c' }} onClick={() => setShowConfirm(true)}>
          Vider les portefeuilles
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      {showConfirm && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <h3 style={{ color: '#b91c1c' }}>Attention</h3>
            <p style={{ margin: 0 }}>
              Cette opération efface <strong>tous les portefeuilles</strong> de manière irréversible.
            </p>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowConfirm(false)}>Annuler</button>
              <button style={{ background: '#b91c1c' }} onClick={handleDeleteAll}>Continuer</button>
            </div>
          </div>
        </div>
      )}

      {orphans.count > 0 && (
        <div className="card orphan-banner">
          <div className="orphan-header" onClick={() => setShowOrphans((v) => !v)}>
            <span>
              <strong>{orphans.count}</strong> catégorie{orphans.count > 1 ? 's' : ''} orpheline{orphans.count > 1 ? 's' : ''} (non rattachée{orphans.count > 1 ? 's' : ''} à un portefeuille)
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{showOrphans ? '▲' : '▼'}</span>
          </div>
          {showOrphans && (
            <ul style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {orphans.categories.map((cat) => (
                <li key={cat.id} className="cat-tag cat-tag--orphan">
                  {cat.libelle}
                  {cat.type && <em className="pattern-chip">{TYPE_LABELS[cat.type]}</em>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card">
        <h3>Mes portefeuilles</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Nom du portefeuille (ex : Loisirs)"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{ flex: 1 }}
          />
          <button onClick={handleCreate}>Créer</button>
        </div>

        {portefeuilles.length === 0 ? (
          <p style={{ color: '#64748b' }}>Aucun portefeuille créé.</p>
        ) : (
          <div className="portefeuille-list">
            {portefeuilles.map((p) => (
              <PortefeuilleCard key={p.id} p={p} allCategories={allCategories} onDelete={handleDelete} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Portefeuilles;
