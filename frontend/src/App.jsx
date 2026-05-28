import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import UploadPage from './pages/UploadPage.jsx';
import Analysis from './pages/Analysis.jsx';
import AnalysisSummary from './pages/AnalysisSummary.jsx';
import AnalysisDepenses from './pages/AnalysisDepenses.jsx';
import AnalysisRecettes from './pages/AnalysisRecettes.jsx';
import AnalysisPortefeuilles from './pages/AnalysisPortefeuilles.jsx';
import PortefeuilleDetail from './pages/PortefeuilleDetail.jsx';
import SuiviFlux from './pages/SuiviFlux.jsx';
import Repartition from './pages/Repartition.jsx';
import { EvolutionDepenses, EvolutionRecettes } from './pages/Evolution.jsx';
import Language from './pages/Language.jsx';
import Categorisation from './pages/Categorisation.jsx';
import Portefeuilles from './pages/Portefeuilles.jsx';
import Settings from './pages/Settings.jsx';
import DataControl from './pages/DataControl.jsx';
import { I18nProvider, useTranslation } from './i18n.js';

function AppInner() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(localStorage.getItem('banko_user'));

  useEffect(() => {
    if (!user && window.location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, navigate]);

  const logout = () => {
    localStorage.removeItem('banko_token');
    localStorage.removeItem('banko_user');
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
          <NavLink to="/" end>{t('import')}</NavLink>
          <div className="nav-group">
            <NavLink to="/analysis">{t('analysis')}</NavLink>
            <div className="subnav">
              <NavLink to="/analysis/depenses">Dépenses</NavLink>
              <NavLink to="/analysis/recettes">Recettes</NavLink>
              <NavLink to="/analysis/portefeuilles">Portefeuilles</NavLink>
              <NavLink to="/analysis/flux">Suivi du flux</NavLink>
              <NavLink to="/analysis/repartition">Répartition</NavLink>
              <NavLink to="/analysis/evolution-depenses">Évol. dépenses</NavLink>
              <NavLink to="/analysis/evolution-recettes">Évol. recettes</NavLink>
            </div>
          </div>
          <NavLink to="/categories">Catégoriser</NavLink>
          <NavLink to="/portefeuilles">Portefeuille</NavLink>
          <NavLink to="/settings">Catégories</NavLink>
          <NavLink to="/language">{t('language')}</NavLink>
          <NavLink to="/data">Données</NavLink>
          <button className="link-button" onClick={logout}>{t('logout')}</button>
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>{t('loggedAs')} <strong>{user}</strong></div>
        </header>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/analysis" element={<Analysis />}>
            <Route index element={<AnalysisSummary />} />
            <Route path="depenses" element={<AnalysisDepenses />} />
            <Route path="recettes" element={<AnalysisRecettes />} />
            <Route path="portefeuilles" element={<AnalysisPortefeuilles />} />
            <Route path="portefeuilles/:id" element={<PortefeuilleDetail />} />
            <Route path="flux" element={<SuiviFlux />} />
            <Route path="repartition" element={<Repartition />} />
            <Route path="evolution-depenses" element={<EvolutionDepenses />} />
            <Route path="evolution-recettes" element={<EvolutionRecettes />} />
          </Route>
          <Route path="/categories" element={<Categorisation />} />
          <Route path="/portefeuilles" element={<Portefeuilles />} />
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
  const [lang, setLang] = useState(localStorage.getItem('banko_lang') || 'fr');
  return (
    <I18nProvider lang={lang} setLang={(next) => {
      localStorage.setItem('banko_lang', next);
      setLang(next);
    }}>
      <AppInner />
    </I18nProvider>
  );
}
