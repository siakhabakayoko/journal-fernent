# Journal Ferñent

Prototype Next.js (App Router) + TypeScript + Tailwind pour **Journal Ferñent**.

> « Union libre des peuples libres d'Afrique. Solidarité internationaliste des travailleurs »

Contact : [fernentbirane@gmail.com](mailto:fernentbirane@gmail.com)

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Persistance : **Turso (libSQL)** quand configuré, sinon JSON (`/content`) + mémoire
- Admin protégé par cookie + `ADMIN_PASSWORD`

## Démarrage local

```bash
cp .env.example .env.local
# éditer ADMIN_PASSWORD (et optionnellement TURSO_*)

bun install
bun run dev
```

Aussi possible avec le gestionnaire Node classique (`install` / `run dev` / `run build`).

Ouvrir http://localhost:3000

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Mot de passe de `/admin`. Défaut local : `fernent-dev` |
| `NEXT_PUBLIC_SITE_URL` | URL canonique (SEO / Open Graph) |
| `TURSO_DATABASE_URL` | URL libSQL Turso (ex. `libsql://…turso.io`) |
| `TURSO_AUTH_TOKEN` | Token d'auth Turso |

Sans `TURSO_*`, l'app continue de fonctionner depuis `content/*.json` (et mémoire sur FS lecture seule).

Sur **Vercel** : Project Settings → Environment Variables → ajouter `ADMIN_PASSWORD`, et pour la prod durable `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.

## Persistance (Turso)

1. Créer une base sur [turso.tech](https://turso.tech)
2. Renseigner `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`
3. Au premier accès (ou via seed) : schéma créé + import de `content/articles.json` (et comments/newsletter si présents) **si les tables sont vides**

```bash
bun run db:seed
```

Schéma aligné sur `src/lib/types.ts` :

- `articles` : id, slug, title, excerpt, body, rubric, author, published_at, featured, comments_enabled
- `comments` : id, article_id, author, body, created_at
- `newsletter` : id, email, created_at

## Admin

1. Aller sur `/admin`
2. Se connecter avec `ADMIN_PASSWORD`
3. Créer / modifier / supprimer des articles

**Persistance**

- Avec Turso : CRUD durable (articles, commentaires, newsletter).
- Sans Turso, en local : écritures dans `content/*.json`.
- Sans Turso, sur Vercel (FS lecture seule) : CRUD en **mode mémoire** (démo). Le seed JSON reste servi au public.

## Routes principales

| Route | Description |
|-------|-------------|
| `/` | Accueil — logo, devise, à la une, newsletter |
| `/rubrique/senegal` | Rubrique Sénégal |
| `/rubrique/afrique` | Rubrique Afrique |
| `/rubrique/international` | Rubrique International |
| `/rubrique/economie` | Rubrique Économie |
| `/rubrique/social` | Rubrique Social |
| `/rubrique/notre-journal` | Rubrique Notre Journal |
| `/article/[slug]` | Article + commentaires |
| `/videos` | Vidéos (placeholders) |
| `/archives` | Archives chronologiques |
| `/contact` | Contact |
| `/admin` | CRUD articles |
| `POST /api/newsletter` | Newsletter |
| `GET/POST /api/comments` | Commentaires |
| `POST /api/admin/login` | Auth admin |
| `POST /api/admin/logout` | Déconnexion |
| `GET/POST/DELETE /api/admin/articles` | CRUD API |

## Navigation

Sur **desktop**, toutes les rubriques sont visibles dans le header (liens one-click) : Sénégal · Afrique · International · Économie · Social · Notre Journal — plus Vidéos, Archives, Contact. Hamburger uniquement sur mobile.

## i18n

Bascule **FR / WO** (Wolof) pour le chrome UI. Articles principalement en français.

## Déploiement Vercel

1. Importer le dépôt GitHub `siakhabakayoko/journal-fernent`
2. Framework preset : Next.js
3. Ajouter `ADMIN_PASSWORD` (+ `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` pour la prod)
4. Deploy

```bash
bun run build
```

## Identité visuelle

- Rouge dominant (`#B91C1C`), blanc, texte noir
- Typo éditoriale (Source Serif / Source Sans)
- UI journal lean, bas débit

## Licence

Prototype éditorial — Ferñent.
