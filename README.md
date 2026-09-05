# Journal Ferñent

Prototype Next.js (App Router) + TypeScript + Tailwind pour **Journal Ferñent**.

> « Union libre des peuples libres d'Afrique. Solidarité internationaliste des travailleurs »

Contact : [fernentbirane@gmail.com](mailto:fernentbirane@gmail.com)

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Contenu articles en JSON (`/content`)
- Admin protégé par cookie + `ADMIN_PASSWORD`

## Démarrage local

```bash
cp .env.example .env.local
# éditer ADMIN_PASSWORD

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

Sur **Vercel** : Project Settings → Environment Variables → ajouter `ADMIN_PASSWORD`.

## Admin

1. Aller sur `/admin`
2. Se connecter avec `ADMIN_PASSWORD`
3. Créer / modifier / supprimer des articles

**Persistance**

- En local : écritures dans `content/articles.json`.
- Sur Vercel (FS lecture seule) : CRUD en **mode mémoire** (démo). Le seed JSON reste servi au public. Pour une prod durable : Postgres/KV.

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
3. Ajouter `ADMIN_PASSWORD`
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
