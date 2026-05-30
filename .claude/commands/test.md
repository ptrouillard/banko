# Skill : test

Lance la suite de tests E2E du backend Banko et interprète les résultats.

## Infrastructure de test

- **Framework** : Vitest + Supertest
- **Base de données** : `/tmp/banko-test.sqlite` (isolée, jamais la prod)
- **Config** : `backend/vitest.config.js`
- **Tests** : `tests/**/*.test.js` (à la racine du projet)
- **Helpers partagés** : `tests/helpers.js` (`api`, `authHeader`, `login`, `cleanDb`)

Chaque fichier de test fait un `cleanDb()` en `beforeAll` et `afterAll` pour repartir d'une base propre.

## Commandes

```bash
# Run complet (une seule fois)
cd /Users/kazoku/Documents/banko/backend && npm test

# Mode watch (relance à chaque modification)
cd /Users/kazoku/Documents/banko/backend && npm run test:watch
```

## Étapes à suivre

### 1. Lancer les tests

```bash
cd /Users/kazoku/Documents/banko/backend && npm test 2>&1
```

### 2. Interpréter les résultats

- **✓ vert** : test passé
- **✗ rouge** : test échoué — affiche le `expect` qui a raté et les valeurs reçues
- **SKIP** : test ignoré volontairement (`.skip`)

Si des tests échouent :
- Lis le message d'erreur exact (expected vs received)
- Remonte jusqu'au handler Express concerné dans `backend/routes/`
- Corrige le code, relance — ne modifie pas les assertions du test sauf si elles sont fausses

### 3. Ajouter un nouveau fichier de test

Structure type à respecter :

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, authHeader, login, cleanDb } from './helpers.js';

beforeAll(() => cleanDb());
afterAll(() => cleanDb());

describe('NOM DE LA ROUTE', () => {
  it('description du cas testé', async () => {
    const res = await api.get('/api/route').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ /* ... */ });
  });
});
```

### 4. Fichiers de test existants

| Fichier | Ce qui est testé |
|---|---|
| `tests/auth.test.js` | Register, login, block, change password, delete |

## Conventions

- Un fichier de test par domaine fonctionnel (auth, categories, portefeuilles, upload…)
- Toujours `cleanDb()` en `beforeAll` / `afterAll`
- Tester le cas nominal ET les cas d'erreur (401, 400, 409…)
- Les tests doivent passer sur la base de test `/tmp/banko-test.sqlite`, jamais sur la vraie DB
