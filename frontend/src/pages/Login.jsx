import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api.js';
import { useTranslation } from '../i18n.js';

function Login({ onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = isRegister ? await register(username, password) : await login(username, password);
      const token = response.data.token;
      if (!token) {
        throw new Error(t('invalidToken'));
      }
      localStorage.setItem('banquo_token', token);
      localStorage.setItem('banquo_user', username);
      onLogin(username);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('importError'));
    }
  };

  return (
    <div className="page page-center">
      <div className="card">
        <h1>Banquo</h1>
        <p>{isRegister ? t('createAccount') : t('login')}</p>
        <form onSubmit={handleSubmit}>
          <label>{t('username')}</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
          <label>{t('password')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="error">{error}</div>}
          <button type="submit">{isRegister ? t('create') : t('login')}</button>
        </form>
        <button className="secondary" onClick={() => setIsRegister((current) => !current)}>
          {isRegister ? t('alreadyAccount') : t('noAccount')}
        </button>
      </div>
    </div>
  );
}

export default Login;
