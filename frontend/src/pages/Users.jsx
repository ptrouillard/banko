import { useEffect, useState } from 'react';
import { register, fetchUsers, blockUser, deleteUser, changeUserPassword } from '../api.js';

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [changingPwdId, setChangingPwdId] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  const load = async () => {
    try {
      const res = await fetchUsers();
      setUsers(res.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await register(username, password);
      setSuccess(`✓ Utilisateur « ${username} » créé.`);
      setUsername('');
      setPassword('');
      setShowPassword(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création.');
    }
  };

  const handleBlock = async (user) => {
    setError('');
    try {
      await blockUser(user.id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur.');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Supprimer le compte « ${user.username} » ?`)) return;
    setError('');
    try {
      await deleteUser(user.id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur.');
    }
  };

  const openChangePwd = (user) => {
    setChangingPwdId(user.id);
    setNewPwd('');
    setShowNewPwd(false);
    setError('');
  };

  const handleChangePwd = async (userId) => {
    if (!newPwd) return;
    setError('');
    try {
      await changeUserPassword(userId, newPwd);
      setChangingPwdId(null);
      setNewPwd('');
      setSuccess('✓ Mot de passe modifié.');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur.');
    }
  };

  return (
    <div className="page">
      <h2>Gestion des utilisateurs</h2>

      <div className="card">
        <h3>Créer un compte</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Pseudo</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: 160 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Mot de passe</label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: 180 }}
              />
              <button
                type="button"
                className="secondary"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? 'Masquer' : 'Afficher'}
              >{showPassword ? '🙈' : '👁'}</button>
              <button
                type="button"
                className="secondary"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}
                title="Générer un mot de passe"
              >⟳</button>
            </div>
          </div>
          <button type="submit">Créer</button>
        </form>
        {error && <p style={{ color: '#b91c1c', marginTop: '0.75rem' }}>{error}</p>}
        {success && <p style={{ color: '#16a34a', marginTop: '0.75rem' }}>{success}</p>}
      </div>

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Pseudo</th>
              <th>Dernière connexion</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.is_blocked ? 0.5 : 1 }}>
                <td style={{ fontWeight: 500 }}>
                  {u.username}
                  {u.is_blocked && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 400 }}>
                      bloqué
                    </span>
                  )}
                </td>
                <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{formatDate(u.last_login)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="secondary"
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
                        onClick={() => handleBlock(u)}
                      >
                        {u.is_blocked ? 'Débloquer' : 'Bloquer'}
                      </button>
                      <button
                        className="secondary"
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
                        onClick={() => changingPwdId === u.id ? setChangingPwdId(null) : openChangePwd(u)}
                      >
                        Mot de passe
                      </button>
                      <button
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', background: '#b91c1c' }}
                        onClick={() => handleDelete(u)}
                      >
                        Supprimer
                      </button>
                    </div>
                    {changingPwdId === u.id && (
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <input
                          type={showNewPwd ? 'text' : 'password'}
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          placeholder="Nouveau mot de passe"
                          style={{ fontSize: '0.8rem', width: 180 }}
                        />
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => setShowNewPwd((v) => !v)}
                          title={showNewPwd ? 'Masquer' : 'Afficher'}
                        >{showNewPwd ? '🙈' : '👁'}</button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => { setNewPwd(generatePassword()); setShowNewPwd(true); }}
                          title="Générer un mot de passe"
                        >⟳</button>
                        <button
                          type="button"
                          style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
                          onClick={() => handleChangePwd(u.id)}
                          disabled={!newPwd}
                        >Valider</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
