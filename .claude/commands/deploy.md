Déploie l'application Banko sur o2switch via rsync + SSH.

## Étapes à suivre dans l'ordre

### 1. Vérifier la configuration

Lis le fichier `.env.deploy` à la racine du projet. S'il n'existe pas, affiche ce message et arrête-toi :

```
❌ Fichier .env.deploy manquant.
Copie .env.deploy.example en .env.deploy et remplis les valeurs.
```

Extrais ces variables depuis `.env.deploy` (format `CLE=valeur`, ignorer les lignes commençant par #) :
- `DEPLOY_HOST` — hôte SSH (ex: foza6046.odns.fr)
- `DEPLOY_USER` — utilisateur SSH (ex: foza6046)
- `DEPLOY_PATH` — chemin absolu de l'app sur le serveur (ex: /home/foza6046/banko)
- `DEPLOY_SSH_KEY` — chemin vers la clé SSH privée (ex: ~/o2switch/o2switch)

La clé SSH est configurée dans `~/.ssh/config` — pas besoin de spécifier `-i` si le fichier config est en place.

### 2. Build du frontend

```bash
cd /Users/kazoku/Documents/banko/frontend && npm run build
```

Vérifie que le dossier `frontend/dist` a bien été créé. Si la commande échoue, arrête-toi et affiche l'erreur.

Notes importantes sur la configuration de production :
- `frontend/.env.production` définit `VITE_API_BASE_URL=/banko/api` et `VITE_BASE=/banko/`
- `frontend/vite.config.js` utilise `loadEnv` pour lire `VITE_BASE` et configurer le `base` Vite
- Les assets dans le build doivent être sous `/banko/assets/...` (vérifie `dist/index.html`)

### 3. Rsync du backend

Exclure : `node_modules/`, `.env`, `*.sqlite`

```bash
rsync -avz --delete \
  --exclude='node_modules/' \
  --exclude='.env' \
  --exclude='*.sqlite' \
  -e "ssh -i $DEPLOY_SSH_KEY" \
  /Users/kazoku/Documents/banko/backend/ \
  $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/backend/
```

### 4. Rsync du point d'entrée cPanel (App.js)

**Important** : le fichier s'appelle `App.js` avec un A majuscule — c'est ce que cPanel attend dans sa config Passenger (PassengerStartupFile App.js).

```bash
rsync -av \
  -e "ssh -i $DEPLOY_SSH_KEY" \
  /Users/kazoku/Documents/banko/App.js \
  $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/App.js
```

### 5. Rsync du build frontend

```bash
rsync -av --delete \
  -e "ssh -i $DEPLOY_SSH_KEY" \
  /Users/kazoku/Documents/banko/frontend/dist/ \
  $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/frontend/dist/
```

Si l'erreur `No such file or directory` apparaît, crée d'abord le dossier distant :
```bash
ssh -i $DEPLOY_SSH_KEY $DEPLOY_USER@$DEPLOY_HOST "mkdir -p $DEPLOY_PATH/frontend/dist"
```
puis relance le rsync.

### 6. Installer les dépendances backend sur le serveur

Node.js n'est pas dans le PATH SSH par défaut sur o2switch. Il faut le spécifier explicitement :

```bash
ssh -i $DEPLOY_SSH_KEY $DEPLOY_USER@$DEPLOY_HOST \
  "cd $DEPLOY_PATH/backend && PATH=/opt/alt/alt-nodejs22/root/usr/bin:\$PATH /opt/alt/alt-nodejs22/root/usr/bin/npm install --production"
```

**Remarque** : `node-sqlite3-wasm` (la librairie SQLite utilisée) est en WebAssembly pur — pas de compilation native, pas de problème de glibc.

Si `package.json` a changé et que les modules semblent corrompus, force une réinstallation propre :
```bash
ssh -i $DEPLOY_SSH_KEY $DEPLOY_USER@$DEPLOY_HOST \
  "cd $DEPLOY_PATH/backend && rm -rf node_modules && PATH=/opt/alt/alt-nodejs22/root/usr/bin:\$PATH /opt/alt/alt-nodejs22/root/usr/bin/npm install --production"
```

### 7. Redémarrer l'application via Passenger

```bash
ssh -i $DEPLOY_SSH_KEY $DEPLOY_USER@$DEPLOY_HOST \
  "touch $DEPLOY_PATH/tmp/restart.txt"
```

Note : `passenger-config restart-app` n'est pas disponible dans le PATH SSH sur o2switch. Le `touch restart.txt` est la méthode fiable. Si après quelques secondes l'app ne redémarre pas, faire un Stop/Start manuel dans cPanel → Node.js Selector.

### 8. Confirmer le déploiement

Vérifie que l'API répond :
```bash
curl -s https://$DEPLOY_HOST/banko/api/ping
# doit retourner : {"ok":true}
```

Affiche un résumé :
```
✅ Déploiement terminé
   Host    : $DEPLOY_HOST
   Chemin  : $DEPLOY_PATH
   Build   : frontend/dist synchronisé (assets sous /banko/assets/)
   API     : /banko/api — réponse {"ok":true} ✓
   Backend : redémarré via tmp/restart.txt
```
