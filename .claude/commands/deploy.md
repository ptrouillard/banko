Déploie l'application Banko sur o2switch via rsync + SSH.

## Étapes à suivre dans l'ordre

### 1. Vérifier la configuration

Lis le fichier `.env.deploy` à la racine du projet. S'il n'existe pas, affiche ce message et arrête-toi :

```
❌ Fichier .env.deploy manquant.
Copie .env.deploy.example en .env.deploy et remplis les valeurs.
```

Extrais ces variables depuis `.env.deploy` (format `CLE=valeur`, ignorer les lignes commençant par #) :
- `DEPLOY_HOST` — hôte SSH (ex: mondomaine.o2switch.net)
- `DEPLOY_USER` — utilisateur SSH
- `DEPLOY_PATH` — chemin absolu de l'app sur le serveur (ex: /home/monuser/banko)
- `DEPLOY_SSH_KEY` — chemin vers la clé SSH (optionnel, défaut : ~/.ssh/id_rsa)

### 2. Build du frontend

```bash
cd /Users/kazoku/Documents/banko/frontend && npm run build
```

Vérifie que le dossier `frontend/dist` a bien été créé. Si la commande échoue, arrête-toi et affiche l'erreur.

### 3. Rsync du backend

Exclure : `node_modules/`, `.env`, `*.sqlite`, `banko.sqlite`, `backend/banko.sqlite`

```bash
rsync -avz --delete \
  --exclude='node_modules/' \
  --exclude='.env' \
  --exclude='*.sqlite' \
  -e "ssh -i $DEPLOY_SSH_KEY" \
  /Users/kazoku/Documents/banko/backend/ \
  $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/backend/
```

### 4. Rsync du build frontend

```bash
rsync -avz --delete \
  -e "ssh -i $DEPLOY_SSH_KEY" \
  /Users/kazoku/Documents/banko/frontend/dist/ \
  $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/frontend/dist/
```

### 5. Installer les dépendances backend sur le serveur

```bash
ssh -i $DEPLOY_SSH_KEY $DEPLOY_USER@$DEPLOY_HOST \
  "cd $DEPLOY_PATH/backend && npm install --production"
```

### 6. Redémarrer l'application via Passenger

```bash
ssh -i $DEPLOY_SSH_KEY $DEPLOY_USER@$DEPLOY_HOST \
  "passenger-config restart-app $DEPLOY_PATH"
```

Si la commande `passenger-config` échoue (non disponible dans le PATH), essaie :
```bash
ssh -i $DEPLOY_SSH_KEY $DEPLOY_USER@$DEPLOY_HOST \
  "touch $DEPLOY_PATH/tmp/restart.txt"
```

### 7. Confirmer le déploiement

Affiche un résumé :
```
✅ Déploiement terminé
   Host    : $DEPLOY_HOST
   Chemin  : $DEPLOY_PATH
   Build   : frontend/dist synchronisé
   Backend : redémarré via Passenger
```
