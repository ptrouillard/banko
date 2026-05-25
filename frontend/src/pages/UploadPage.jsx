import { useState } from 'react';
import { uploadFile } from '../api.js';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier Excel');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await uploadFile(file);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l’import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Importer un fichier</h2>
      <form onSubmit={handleSubmit} className="card upload-card">
        <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" disabled={loading}>{loading ? 'Import en cours…' : 'Importer'}</button>
        {error && <div className="error">{error}</div>}
      </form>
      {result && (
        <div className="card summary-card">
          <h3>Résultat de l’import</h3>
          <p>Lignes importées : <strong>{result.imported}</strong></p>
          <p>Lignes déjà présentes : <strong>{result.duplicates}</strong></p>
          <p>Première date : <strong>{result.firstDate || 'N/A'}</strong></p>
          <p>Dernière date : <strong>{result.lastDate || 'N/A'}</strong></p>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
