import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadRules(banque) {
  try {
    const content = readFileSync(join(__dirname, `regles_${banque}.json`), 'utf-8');
    return JSON.parse(content).regles || [];
  } catch {
    return [];
  }
}

// Résout une spec { fixe, groupe, template } en valeur concrète à partir des groupes du match regex.
function resolveSpec(spec, match) {
  if (!spec) return null;
  if (spec.fixe) return spec.fixe;
  if (spec.groupe != null) return (match[spec.groupe] || '').trim() || null;
  if (spec.template) {
    return spec.template.replace(/\{(\d+)\}/g, (_, n) => (match[parseInt(n, 10)] || '').trim());
  }
  return null;
}

// Normalise le libellé (sauts de ligne et espaces multiples → espace simple)
// puis tente de faire correspondre chaque règle dans l'ordre.
export function applyRules(libelle, rules) {
  const normalized = String(libelle).replace(/\s+/g, ' ').trim();
  for (const rule of rules) {
    const regex = new RegExp(rule.regex, rule.flags || '');
    const match = normalized.match(regex);
    if (match) {
      return {
        ruleId: rule.id,
        categorie: resolveSpec(rule.categorie, match),
        portefeuille: resolveSpec(rule.portefeuille, match),
        type: rule.type || null,
      };
    }
  }
  return null;
}
