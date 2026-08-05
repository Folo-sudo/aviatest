# AviaTest

Site Next.js pour l'entrainement aux tests psychotechniques pilote.

**Hebergement cible : Vercel.**  
`main` = production. Les tests se font en local + sur une branche `dev` (preview Vercel), jamais directement en prod.

Guide detaille : **[docs/vercel-workflow.md](docs/vercel-workflow.md)**

## Developpement local

### 1. Installer les dependances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Minimum requis :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Partir de [`supabase/env.example`](supabase/env.example) et renseigner `.env.local` (jamais committe).

Option utile en local :

- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`

Exemple :

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Les memes cles doivent exister dans Vercel (Production + Preview).

### 3. Lancer le site

```bash
npm run dev
```

Ouvrir `http://localhost:3000`.

### 4. Verifier la build avant de publier

```bash
npm run build
npm start
```

## Workflow recommande

Detail et checklist : [docs/vercel-workflow.md](docs/vercel-workflow.md)

Resume :

1. Travailler sur `dev` (ou une feature branchee depuis `dev` / `main`).
2. Coder en local (`npm run dev`), valider avec `npm run build`.
3. `git push` sur la branche de test → **preview Vercel**.
4. Tester la preview.
5. Merger sur **`main` seulement quand c'est pret** → deploy **Production**.
6. Verifier l'URL Production (hard refresh).

Ne pas pousser du WIP experimental sur `main`.

## Branches

| Branche | Role |
| --- | --- |
| `main` | Production (Vercel Production) |
| `dev` | Integration / tests (preview Vercel) |
| autres | Features / essais (preview Vercel) |

## Supabase

Vercel (ou local) et Supabase sont separes. Le site se connecte au projet Supabase via les variables `NEXT_PUBLIC_SUPABASE_*`.

Option simple : **dev local + Supabase distant** (celle utilisee aujourd'hui).

Apres toute installation ou mise a jour des scripts `supabase/schema-*.sql`, executer
[`supabase/schema-security-hardening.sql`](supabase/schema-security-hardening.sql) en dernier afin de retirer l'acces anonyme aux RPC privilegiees.

## Migration Netlify → Vercel

Pendant la bascule :

- **Garder** `netlify.toml` et le site Netlify en secours.
- **Utiliser** Vercel pour les previews et, une fois pret, pour la production.
- **Ignorer** les deploys Netlify au quotidien si Vercel est branche.
- **Supprimer plus tard** la connexion Netlify / `netlify.toml` seulement quand le domaine pointe definitivement sur Vercel.

Voir la section complete dans [docs/vercel-workflow.md](docs/vercel-workflow.md).

## Cursor / agents

- Coder en local, controler les diffs Git.
- Pas de push automatique vers `main` sans demande explicite.
- Garder `.env.local` hors commit.
- Eviter de modifier le meme fichier en parallele depuis plusieurs sessions.

## Commandes utiles

```bash
npm run dev
npm run build
npm start
npm run lint
```

## Note

Le lint global peut encore remonter des erreurs historiques. Avant un merge sur `main`, la verification critique reste `npm run build` + preview Vercel OK.
