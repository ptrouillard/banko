import { useEffect, useState } from 'react';
import { fetchCategories, createCategory, updateCategoryPattern, deleteCategory } from '../api.js';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [newLibelle, setNewLibelle] = useState('');
  const [newPattern, setNewPattern] = useState('');
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
      await createCategory(newLibelle.trim(), newPattern.trim());
      setNewLibelle('');
      setNewPattern('');
      load();
    } catch {
      setError('Cette catégorie existe déjà ou une erreur est survenue');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette catégorie ?')) return;
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

  return (
    <div className="page">
      <h2>Catégories</h2>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>Ajouter une catégorie</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label>Libellé</label>
            <input
              type="text"
              placeholder="ex : Courses"
              value={newLibelle}
              onChange={(e) => setNewLibelle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label>Pattern (optionnel)</label>
            <input
              type="text"
              placeholder="ex : LECLERC"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button onClick={handleAdd}>Ajouter</button>
        </div>
      </div>

      <div className="card table-card">
        <h3>Liste des catégories</h3>
        {categories.length === 0
          ? <p>Aucune catégorie enregistrée.</p>
          : (
            <table>
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Pattern</th>
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
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      {editingId === cat.id ? (
                        <>
                          <button onClick={() => handleSavePattern(cat.id)}>Sauver</button>
                          <button onClick={() => setEditingId(null)}>Annuler</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(cat)}>Modifier pattern</button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            style={{ color: '#c0392b' }}
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}

export default Categories;
