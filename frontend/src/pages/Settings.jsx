import { useEffect, useState } from 'react';
import {
  resetMonths,
  fetchCategories,
  createCategory,
  updateCategoryPattern,
  updateCategoryType,
  deleteCategory,
  deleteAllCategories,
} from '../api.js';

const TYPE_LABELS = { depense: 'Dépenses', recette: 'Recettes', interne: 'Interne' };

function TypeSelect({ value, onChange }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>
      <option value="depense">Dépenses</option>
      <option value="recette">Recettes</option>
      <option value="interne">Interne</option>
    </select>
  );
}

function CategoriesCrud() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [newLibelle, setNewLibelle] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newType, setNewType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingPattern, setEditingPattern] = useState('');

  const load = () => {
    fetchCategories()
      .then((res) => setCategories(res.data))
      .catch(() => setError('Erreur lors du chargement des catégories'));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newLibelle.trim()) return;
    try {
      await createCategory(newLibelle.trim(), newPattern.trim(), newType || null);
      setNewLibelle('');
      setNewPattern('');
      setNewType('');
      load();
    } catch {
      setError('Cette catégorie existe déjà ou une erreur est survenue');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette catégorie ? Les opérations associées seront décatégorisées.')) return;
    try {
      await deleteCategory(id);
      load();
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditingPattern(cat.pattern || '');
  };

  const handleSavePattern = async (id) => {
    try {
      await updateCategoryPattern(id, editingPattern);
      setEditingId(null);
      load();
    } catch {
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleTypeChange = async (id, type) => {
    try {
      await updateCategoryType(id, type);
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, type: type || null } : c));
    } catch {
      setError('Erreur lors de la mise à jour du type');
    }
  };

  return (
    <div className="card">
      <h3>Catégories</h3>
      {error && <div className="error">{error}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <label>Nom</label>
          <input
            type="text"
            placeholder="ex : Courses"
            value={newLibelle}
            onChange={(e) => setNewLibelle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div>
          <label>Mot clé</label>
          <input
            type="text"
            placeholder="ex : LECLERC"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div>
          <label>Type</label>
          <TypeSelect value={newType} onChange={setNewType} />
        </div>
        <button onClick={handleAdd}>Ajouter</button>
      </div>

      {categories.length === 0 ? (
        <p>Aucune catégorie enregistrée.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Mot clé</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.libelle}</td>
                <td>
                  {editingId === cat.id ? (
                    <input
                      type="text"
                      value={editingPattern}
                      onChange={(e) => setEditingPattern(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePattern(cat.id)}
                      autoFocus
                    />
                  ) : (
                    <span>{cat.pattern || <em style={{ opacity: 0.5 }}>—</em>}</span>
                  )}
                </td>
                <td>
                  <TypeSelect value={cat.type} onChange={(type) => handleTypeChange(cat.id, type)} />
                </td>
                <td style={{ display: 'flex', gap: '0.4rem' }}>
                  {editingId === cat.id ? (
                    <>
                      <button onClick={() => handleSavePattern(cat.id)}>Sauver</button>
                      <button onClick={() => setEditingId(null)}>Annuler</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(cat)}>Modifier mot clé</button>
                      <button onClick={() => handleDelete(cat.id)} style={{ color: '#c0392b' }}>
                        Supprimer
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
    } catch {
      setMessage('Erreur lors de la suppression.');
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

      <CategoriesCrud />

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
