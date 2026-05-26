import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import UploadPage from './pages/UploadPage.jsx';
import Analysis from './pages/Analysis.jsx';
import Language from './pages/Language.jsx';
import Categories from './pages/Categories.jsx';
import Settings from './pages/Settings.jsx';
import DataControl from './pages/DataControl.jsx';
import { I18nProvider, useTranslation } from './i18n.js';

function AppInner() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(localStorage.getItem('banquo_user'));

  useEffect(() => {
    if (!user && window.location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, navigate]);

  const logout = () => {
    localStorage.removeItem('banquo_token');
    localStorage.removeItem('banquo_user');
    setUser(null);
    navigate('/login');
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={(username) => setUser(username)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">{t('appName')}</div>
        <nav>
          <Link to="/">{t('import')}</Link>
          <Link to="/analysis">{t('analysis')}</Link>
          <Link to="/categories">Catégories</Link>
          <Link to="/settings">Paramétrage</Link>
          <Link to="/language">{t('language')}</Link>
          <Link to="/data">Données</Link>
          <button className="link-button" onClick={logout}>{t('logout')}</button>
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>{t('loggedAs')} <strong>{user}</strong></div>
        </header>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/language" element={<Language />} />
          <Route path="/data" element={<DataControl />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState(localStorage.getItem('banquo_lang') || 'fr');
  return (
    <I18nProvider lang={lang} setLang={(next) => {
      localStorage.setItem('banquo_lang', next);
      setLang(next);
    }}>
      <AppInner />
    </I18nProvider>
  );
}
