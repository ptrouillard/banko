# Banquo : ma banque perso

Application web pour analyser rapidement les dépenses courantes à partir d'un fichier Excel bancaire.

## Architecture

- backend : API Express + SQLite
- frontend : React + Vite

## Installation

1. Ouvrir un terminal dans le dossier `banqo`
2. Installer les dépendances backend :
   ```bash
   cd backend
   npm install
   ```
3. Installer les dépendances frontend :
   ```bash
   cd ../frontend
   npm install
   ```

## Lancement

- Backend : `cd backend && npm run dev`
- Frontend : `cd frontend && npm run dev`

## Points clés implémentés

- Authentification pseudo / mot de passe
- Upload de fichier Excel
- Insertion dans SQLite sans doublons (date + libellé)
- Résumé des imports
- API d'analyse par mois
- Catégories sauvegardables par opération
