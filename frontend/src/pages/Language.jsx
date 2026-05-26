import { useEffect } from 'react';
import { useTranslation } from '../i18n.js';

function Language() {
  const { lang, setLang, t } = useTranslation();

  useEffect(() => {
    localStorage.setItem('banquo_lang', lang);
  }, [lang]);

  return (
    <div className="page">
      <div className="card">
        <h2>{t('language')}</h2>
        <p>{t('chooseLanguage')}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <label>
            <input type="radio" name="lang" value="fr" checked={lang === 'fr'} onChange={() => setLang('fr')} /> {t('french')}
          </label>
          <label>
            <input type="radio" name="lang" value="en" checked={lang === 'en'} onChange={() => setLang('en')} /> {t('english')}
          </label>
        </div>
        <p style={{ marginTop: 12 }}>{t('saveLanguage')}</p>
      </div>
    </div>
  );
}

export default Language;
