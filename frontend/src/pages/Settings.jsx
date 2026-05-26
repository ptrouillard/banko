import { useState } from 'react';
import { resetMonths } from '../api.js';

function Settings() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
      <h2>Paramétrage</h2>

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
