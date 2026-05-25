import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import UploadPage from './pages/UploadPage.jsx';
import Analysis from './pages/Analysis.jsx';

function App() {
  const navigate = useNavigate();
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
        <div className="brand">Banquo</div>
        <nav>
          <Link to="/">Import</Link>
          <Link to="/analysis">Analyse du budget</Link>
          <button className="link-button" onClick={logout}>Déconnexion</button>
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>Connecté en tant que <strong>{user}</strong></div>
        </header>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
