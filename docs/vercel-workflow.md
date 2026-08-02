# Workflow Git + Vercel (AviaTest)

Guide de reference pour developper, tester et publier sans deployer accidentellement en production.

## Branches

| Branche | Role | Deploy Vercel |
| --- | --- | --- |
| `main` | **Production** uniquement | Production (domaine Vercel / custom) |
| `dev` | Integration / tests | Preview durable a tester avant merge |
| `cursor/...`, features, etc. | Travail ponctuel | Preview automatique a chaque push |

Regle d'or : **ne jamais pousser du travail experimental directement sur `main`.**

## Variables d'environnement (Vercel)

A renseigner dans Vercel → Project → Settings → Environment Variables, pour **Production**, **Preview** et **Development** :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL` (URL canonique du site, ex. domaine prod ; en preview Vercel peut servir une autre origine)

En local, les memes cles vont dans `.env.local` (jamais committe). Modele : [`supabase/env.example`](../supabase/env.example).

## Developpement local

```bash
npm install
# renseigner .env.local
npm run dev          # http://localhost:3000
npm run build && npm start   # smoke test build prod
```

Le site local parle au projet Supabase distant via `.env.local`. Local ≠ “sans backend”.

## Workflow recommande (etapes exactes)

### 1. Partir d'une branche de dev a jour

```bash
git checkout main
git pull origin main
git checkout dev        # cree-la une fois : git checkout -b dev
git merge main          # ou rebase si tu preferes
git push -u origin dev
```

Pour une feature isolee :

```bash
git checkout dev
git pull origin dev
git checkout -b cursor/ma-feature
```

### 2. Coder en local

- Editer, tester avec `npm run dev`
- Verifier `npm run build` avant de considerer le lot pret

### 3. Push sur la branche de test (pas `main`)

```bash
git add -A
git commit -m "feat: ..."
git push -u origin HEAD
```

### 4. Tester la preview Vercel

- Ouvre le lien **Preview** dans le dashboard Vercel (ou le commentaire GitHub du commit/PR)
- Verifie les parcours critiques (connexion, un exercice, Boite/Agora, etc.)
- Hard refresh (`Cmd+Shift+R`) si le cache te trompe
- **Ne prends pas une ancienne preview hash pour la prod**

### 5. Merger sur `main` seulement quand c'est pret

Checklist avant merge :

1. `npm run build` OK en local
2. Preview Vercel OK
3. Pas de secrets (`.env.local`) dans le diff
4. Variables Vercel Production a jour si tu as ajoute une nouvelle env

Puis :

```bash
git checkout main
git pull origin main
git merge dev           # ou merge de la PR GitHub
git push origin main
```

Preferer une **Pull Request** `dev` → `main` (ou feature → `main`) pour garder une revue claire.

### 6. Verifier la production apres merge

1. Attendre le deploy **Production** Vercel (statut Ready)
2. Ouvrir l'URL **Production** (pas une preview)
3. Hard refresh
4. Confirmer que le commit visible = `origin/main`

## Precautions anti-prod accidentelle

- Dans Vercel : Production Branch = **`main`** uniquement
- Travailler sur `dev` / features ; merger `main` en conscience
- Desactiver les auto-deploys Netlify sur `main` une fois Vercel en prod (voir ci-dessous)
- Ne pas force-push sur `main`
- Ne pas deployer manuellement une feature branch en Production depuis le dashboard

## Migration depuis Netlify / coexistence

### Ce qu'on garde encore

- [`netlify.toml`](../netlify.toml) : config historique Netlify (`npm run build`, Node 22). **Non destructif** : on le laisse tant que le site Netlify peut servir de secours.
- L'URL Netlify actuelle (`*.netlify.app`) peut rester en ligne pendant la bascule.

### Ce qu'on peut ignorer au quotidien

- Deploys Netlify et leurs previews, une fois Vercel branche
- Les conseils “economiser les credits Netlify” du vieux README (remplaces par ce workflow)

### Ce qu'on pourra supprimer plus tard

Quand Vercel est la seule source de verite et le domaine pointe dessus :

1. Deconnecter le site Netlify du repo GitHub (ou arreter les builds)
2. Supprimer `netlify.toml` si plus aucun usage
3. Retirer les mentions Netlify obsoletes dans la doc / regles Cursor

**Ne rien supprimer tant que la bascule DNS / domaine n'est pas validee.**

## Vercel : rien a committer de special

Next.js 16 est detecte automatiquement. Pas de `vercel.json` obligatoire pour ce projet.

Build commande effective : `npm run build` (voir `package.json`).

## En cas de doute (“rien n'a change”)

1. URL = **Production** Vercel (pas preview, pas ancien Netlify hash) ?
2. Commit sur `origin/main` ?
3. Deploy Vercel **Ready** + hard refresh ?
