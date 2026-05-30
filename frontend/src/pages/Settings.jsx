import { useEffect, useState } from 'react';
import {
  fetchCategories,
  deleteAllCategories,
  resetMonths,
  fetchPortefeuilles,
  addCategoryToPortefeuille,
  removeCategoryFromPortefeuille,
  register,
} from '../api.js';

const TYPE_LABELS = { depense: 'Dépenses', recette: 'Recettes', interne: 'Interne' };

function CategoryRow({ cat, allPortfolios, onRefresh }) {
  const [saving, setSaving] = useState(false);

  const assignedIds = new Set(cat.portfolios.map((p) => p.id));
  const available = allPortfolios.filter((p) => !assignedIds.has(p.id));

  const handleAdd = async (portId) => {
    if (!portId) return;
    setSaving(true);
    try {
      await addCategoryToPortefeuille(parseInt(portId), cat.id);
      onRefresh();
    } catch {}
    setSaving(false);
  };

  const handleRemove = async (portId) => {
    setSaving(true);
    try {
      await removeCategoryFromPortefeuille(portId, cat.id);
      onRefresh();
    } catch {}
    setSaving(false);
  };

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{cat.libelle}</td>
      <td>
        {cat.type
          ? <span className="pattern-chip">{TYPE_LABELS[cat.type]}</span>
          : <em style={{ opacity: 0.4 }}>—</em>}
      </td>
      <td>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.3rem' }}>
          {cat.portfolios.map((p) => (
            <span key={p.id} className="cat-tag">
              {p.nom}
              <button
                onClick={() => handleRemove(p.id)}
                disabled={saving}
                style={{ marginLeft: '0.3rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                title="Retirer de ce portefeuille"
              >✕</button>
            </span>
          ))}
          {available.length > 0 && (
            <select
              value=""
              onChange={(e) => handleAdd(e.target.value)}
              disabled={saving}
              style={{ fontSize: '0.8rem', padding: '2px 4px', border: '1px dashed #cbd5e1', borderRadius: 4, color: '#64748b', background: 'transparent', cursor: 'pointer' }}
            >
              <option value="">+ Portefeuille…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          )}
        </div>
      </td>
    </tr>
  );
}

function CategoriesTable() {
  const [categories, setCategories] = useState([]);
  const [allPortfolios, setAllPortfolios] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const load = async () => {
    try {
      const [cRes, pRes] = await Promise.all([fetchCategories(), fetchPortefeuilles()]);
      setCategories(cRes.data);
      setAllPortfolios(pRes.data);
    } catch {
      setError('Erreur lors du chargement');
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter
    ? categories.filter((c) => c.libelle.toLowerCase().includes(filter.toLowerCase()))
    : categories;

  return (
    <div className="card table-card">
      {error && <div className="error">{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{categories.length} catégorie{categories.length !== 1 ? 's' : ''}</span>
        <input
          type="text"
          placeholder="Filtrer par nom…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 200, fontSize: '0.85rem' }}
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#64748b' }}>{filter ? 'Aucune catégorie correspondante.' : 'Aucune catégorie enregistrée.'}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Présent dans les portefeuilles</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cat) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                allPortfolios={allPortfolios}
                onRefresh={load}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CreateUserCard() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await register(username, password);
      setMessage(`✓ Utilisateur « ${username} » créé.`);
      setUsername('');
      setPassword('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erreur lors de la création.');
    }
  };

  return (
    <div className="card">
      <h3>Créer un utilisateur</h3>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 300 }}>
        <input placeholder="Pseudo" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Créer</button>
      </form>
      {message && <p style={{ marginTop: '0.75rem' }}>{message}</p>}
    </div>
  );
}

function Settings() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAllCategories = async () => {
    try {
      await deleteAllCategories();
      setShowConfirm(false);
      window.location.reload();
    } catch {
      setShowConfirm(false);
    }
  };

  const handleResetMonths = async () => {
    if (!window.confirm('Remettre à zéro la liste des mois et la recalculer depuis les données ?')) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await resetMonths();
      setMessage(`✓ Liste des mois recalculée — ${res.data.count} mois trouvé(s).`);
    } catch {
      setMessage('Erreur lors de la remise à zéro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Catégories</h2>
        <button style={{ background: '#b91c1c' }} onClick={() => setShowConfirm(true)}>
          Vider les catégories
        </button>
      </div>

      {showConfirm && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <h3 style={{ color: '#b91c1c' }}>Attention</h3>
            <p style={{ margin: 0 }}>
              Cette opération efface <strong>toutes les catégories</strong> et décatégorise toutes les opérations, de manière irréversible.
            </p>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowConfirm(false)}>Annuler</button>
              <button style={{ background: '#b91c1c' }} onClick={handleDeleteAllCategories}>Continuer</button>
            </div>
          </div>
        </div>
      )}

      <CategoriesTable />

      {localStorage.getItem('banko_user') === 'pedro' && <CreateUserCard />}

      <div className="card">
        <h3>Mois disponibles</h3>
        <p>
          Ce bouton supprime la liste des mois stockée en base et la recalcule
          entièrement depuis les opérations importées.
        </p>
        <button onClick={handleResetMonths} disabled={loading}>
          {loading ? 'En cours…' : 'RAZ des mois'}
        </button>
        {message && <p style={{ marginTop: '0.75rem' }}>{message}</p>}
      </div>
    </div>
  );
}

export default Settings;
