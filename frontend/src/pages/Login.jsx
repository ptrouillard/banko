import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api.js';
import { useTranslation } from '../i18n.js';

function Login({ onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await login(username, password);
      const token = response.data.token;
      if (!token) {
        throw new Error(t('invalidToken'));
      }
      localStorage.setItem('banko_token', token);
      localStorage.setItem('banko_user', username);
      onLogin(username);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('importError'));
    }
  };

  return (
    <div className="page page-center">
      <div className="card">
        <h1>Banko</h1>
        <p>{t('login')}</p>
        <form onSubmit={handleSubmit}>
          <label>{t('username')}</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
          <label>{t('password')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="error">{error}</div>}
          <button type="submit">{t('login')}</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
