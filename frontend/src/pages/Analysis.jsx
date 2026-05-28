import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { fetchMonths } from '../api.js';
import { useTranslation } from '../i18n.js';

export function formatMonthLabel(month) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return month;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  const label = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Analysis() {
  const { t } = useTranslation();
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const validMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
    fetchMonths()
      .then((res) => {
        const valid = Array.isArray(res.data) ? res.data.filter((m) => validMonthPattern.test(m)) : [];
        setMonths(valid);
        if (valid.length > 0) setSelectedMonth(valid[0]);
      })
      .catch(() => setError(t('fetchMonthsError')));
  }, [t]);

  return (
    <div className="page">
      <h2>{t('analysis')}</h2>
      {error && <div className="error">{error}</div>}

      <div className="card analysis-month-bar">
        <label>{t('selectMonth')}</label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="">Toutes les données</option>
          {months.map((m) => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      <div className="analysis-subnav">
        <NavLink to="/analysis" end className={({ isActive }) => isActive ? 'active' : ''}>Résumé</NavLink>
        <NavLink to="/analysis/depenses" className={({ isActive }) => isActive ? 'active' : ''}>Dépenses</NavLink>
        <NavLink to="/analysis/recettes" className={({ isActive }) => isActive ? 'active' : ''}>Recettes</NavLink>
        <NavLink to="/analysis/portefeuilles" className={({ isActive }) => isActive ? 'active' : ''}>Portefeuilles</NavLink>
        <NavLink to="/analysis/flux" className={({ isActive }) => isActive ? 'active' : ''}>Suivi du flux</NavLink>
        <NavLink to="/analysis/repartition" className={({ isActive }) => isActive ? 'active' : ''}>Répartition</NavLink>
        <NavLink to="/analysis/evolution-depenses" className={({ isActive }) => isActive ? 'active' : ''}>Évol. dépenses</NavLink>
        <NavLink to="/analysis/evolution-recettes" className={({ isActive }) => isActive ? 'active' : ''}>Évol. recettes</NavLink>
      </div>

      <Outlet context={{ month: selectedMonth }} />
    </div>
  );
}

export default Analysis;
