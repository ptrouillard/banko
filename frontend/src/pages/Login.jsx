import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api.js';

function Login({ onLogin }) {
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
        throw new Error('Token manquant');
      }
      localStorage.setItem('banquo_token', token);
      localStorage.setItem('banquo_user', username);
      onLogin(username);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la connexion');
    }
  };

  return (
    <div className="page page-center">
      <div className="card">
        <h1>Banquo</h1>
        <p>{isRegister ? 'Créer un compte' : 'Connexion'}</p>
        <form onSubmit={handleSubmit}>
          <label>Pseudo</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="error">{error}</div>}
          <button type="submit">{isRegister ? 'Créer' : 'Se connecter'}</button>
        </form>
        <button className="secondary" onClick={() => setIsRegister((current) => !current)}>
          {isRegister ? 'J’ai déjà un compte' : 'Créer un compte'}
        </button>
      </div>
    </div>
  );
}

export default Login;
