import { useState } from 'react';
import { uploadFile } from '../api.js';
import { useTranslation } from '../i18n.js';

function UploadPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError(t('selectFile'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await uploadFile(file);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || t('importError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>{t('uploadTitle')}</h2>
      <form onSubmit={handleSubmit} className="card upload-card">
        <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" disabled={loading}>{loading ? t('importing') : t('importButton')}</button>
        {error && <div className="error">{error}</div>}
      </form>
      {result && (
        <div className="card summary-card">
          <h3>{t('importResult')}</h3>
          <p>{t('importedRows')} : <strong>{result.imported}</strong></p>
          <p>{t('duplicateRows')} : <strong>{result.duplicates}</strong></p>
          {result.autoCategorized > 0 && (
            <p>Catégorisées automatiquement : <strong style={{ color: '#166534' }}>{result.autoCategorized}</strong></p>
          )}
          <p>{t('firstDate')} : <strong>{result.firstDate || 'N/A'}</strong></p>
          <p>{t('lastDate')} : <strong>{result.lastDate || 'N/A'}</strong></p>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
