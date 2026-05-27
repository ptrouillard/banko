import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { fetchPortefeuilles } from '../api.js';

function AnalysisPortefeuilles() {
  const { month } = useOutletContext();
  const navigate = useNavigate();
  const [portefeuilles, setPortefeuilles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPortefeuilles()
      .then((res) => setPortefeuilles(res.data))
      .catch(() => setError('Erreur lors du chargement des portefeuilles'));
  }, []);

  const permanents = portefeuilles.filter((p) => p.permanent);
  const manuels = portefeuilles.filter((p) => !p.permanent);

  const goToDetail = (id) => navigate(`/analysis/portefeuilles/${id}`);

  const scope = month ? `— ${month}` : '— Toutes les données';

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {permanents.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Automatiques <span className="portefeuille-scope">{scope}</span></h3>
          <div className="portefeuille-list">
            {permanents.map((p) => (
              <div key={p.id} className="portefeuille-card portefeuille-card--auto" onClick={() => goToDetail(p.id)}>
                <div className="portefeuille-card-header">
                  <span className="portefeuille-nom">{p.nom}</span>
                  <span className="badge-auto">Automatique</span>
                </div>
                <div className="portefeuille-meta">{p.nb_categories} catégorie{p.nb_categories !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Mes portefeuilles <span className="portefeuille-scope">{scope}</span></h3>
        {manuels.length === 0 ? (
          <p style={{ color: '#64748b' }}>Aucun portefeuille. Créez-en dans la section "Portefeuille" du menu.</p>
        ) : (
          <div className="portefeuille-list">
            {manuels.map((p) => (
              <div key={p.id} className="portefeuille-card" onClick={() => goToDetail(p.id)}>
                <div className="portefeuille-card-header">
                  <span className="portefeuille-nom">{p.nom}</span>
                </div>
                <div className="portefeuille-meta">{p.nb_categories} catégorie{p.nb_categories !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisPortefeuilles;
