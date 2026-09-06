# Journal Ferñent

Prototype Next.js (App Router) + TypeScript + Tailwind pour **Journal Ferñent**.

> « Union libre des peuples libres d'Afrique. Solidarité internationaliste des travailleurs »

Contact : [fernentbirane@gmail.com](mailto:fernentbirane@gmail.com)

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Persistance : **Turso (libSQL)** quand configuré, sinon JSON (`/content`) + mémoire
- Uploads : filesystem local (`public/uploads/YYYY/…`) ou **Vercel Blob** si `BLOB_READ_WRITE_TOKEN`
- Admin protégé par cookie + `ADMIN_PASSWORD`

## Démarrage local

```bash
cp .env.example .env.local
# éditer ADMIN_PASSWORD (et optionnellement TURSO_*, BLOB_READ_WRITE_TOKEN)

bun install
bun run dev
```

Aussi possible avec le gestionnaire Node classique (`install` / `run dev` / `run build`).

Ouvrir http://localhost:3000

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Mot de passe de `/admin`. Défaut local : `fernent-dev` |
| `NEXT_PUBLIC_SITE_URL` | URL canonique (SEO / Open Graph / liens e-mail) |
| `TURSO_DATABASE_URL` | URL libSQL Turso (ex. `libsql://…turso.io`) |
| `TURSO_AUTH_TOKEN` | Token d'auth Turso |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob (uploads images/PDF sur Vercel) |
| `RESEND_API_KEY` | Clé API [Resend](https://resend.com) pour alertes newsletter (optionnel) |
| `EMAIL_FROM` | Expéditeur Resend (ex. `Journal Ferñent <alerts@votre-domaine.com>`). Défaut test : `onboarding@resend.dev` |

Sans `TURSO_*`, l'app continue de fonctionner depuis `content/*.json` (et mémoire sur FS lecture seule).

Sur **Vercel** : Project Settings → Environment Variables → ajouter `ADMIN_PASSWORD`, et pour la prod durable `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`. Pour les uploads, ajoutez aussi `BLOB_READ_WRITE_TOKEN` (sinon collez une URL dans le formulaire admin). Pour les **alertes e-mail** aux abonnés newsletter à chaque nouvelle brève / capsule / mensuel : `RESEND_API_KEY`, `EMAIL_FROM` (domaine vérifié en prod), et `NEXT_PUBLIC_SITE_URL`.

## Persistance (Turso)

1. Créer une base sur [turso.tech](https://turso.tech)
2. Renseigner `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`
3. Au premier accès (ou via seed) : schéma créé + import de `content/*.json` **si les tables sont vides**

```bash
bun run db:seed
```

Schéma aligné sur `src/lib/types.ts` :

- `articles` : id, slug, title, excerpt, body, rubric, author, published_at, featured, comments_enabled, **cover_image**
- `issues` : id, slug, title, month, year, description, pdf_url, cover_image, published_at
- `comments` : id, article_id, author, body, created_at
- `newsletter` : id, email, created_at

## Images de couverture

- Champ optionnel `coverImage` sur chaque article (URL https ou chemin local `/covers/…`, `/uploads/…`).
- Affichées sur les cartes, le hero « à la une », et la page article.
- Placeholders éditoriaux SVG dans `public/covers/`.

## Numéros mensuels (PDF)

- Type `MonthlyIssue` + table / JSON `content/issues.json`.
- Affichage texte + **Consulter** / **Télécharger** uniquement (pas d'image de couverture).
- Page `/mensuel` (et section accueil) : liste des numéros PDF.
- Admin → onglet **Numéros mensuels** : créer / éditer titre, mois/année, description, PDF.

## Alertes newsletter (Resend)

Quand l'admin **crée** une brève, une capsule ou un mensuel, tous les e-mails de `newsletter` reçoivent une alerte via Resend (`src/lib/notify-subscribers.ts`).

- Sans `RESEND_API_KEY` : warning en log, publication **non bloquée**.
- En production : vérifier le domaine chez Resend et renseigner `EMAIL_FROM`.

### TODO — ajouter le vrai PDF

Le seed contient un numéro placeholder (`Ferñent — Septembre 2026`) **sans fichier PDF** (`pdfUrl` vide). Pour publier le PDF :

1. Aller sur `/admin` → onglet **Numéros mensuels**
2. Modifier le numéro de septembre 2026
3. Uploader le PDF (fichier) **ou** coller une URL publique
4. Enregistrer — le bouton de téléchargement apparaît sur `/archives`

Sur Vercel, configurez `BLOB_READ_WRITE_TOKEN` pour que l'upload fonctionne (FS lecture seule).

## Admin

1. Aller sur `/admin`
2. Se connecter avec `ADMIN_PASSWORD`
3. Créer / modifier / supprimer des articles (avec image de couverture) et des numéros mensuels

**Persistance**

- Avec Turso : CRUD durable (articles, issues, commentaires, newsletter).
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
| `/article/[slug]` | Article + couverture + commentaires |
| `/videos` | Vidéos (placeholders) |
| `/archives` | Numéros PDF + archives chronologiques |
| `/contact` | Contact |
| `/admin` | CRUD articles + numéros |
| `POST /api/newsletter` | Newsletter |
| `GET/POST /api/comments` | Commentaires |
| `POST /api/admin/login` | Auth admin |
| `POST /api/admin/logout` | Déconnexion |
| `GET/POST/DELETE /api/admin/articles` | CRUD articles |
| `GET/POST/DELETE /api/admin/issues` | CRUD numéros mensuels |
| `POST /api/admin/upload` | Upload image/PDF (auth) |

## Navigation

Sur **desktop**, toutes les rubriques sont visibles dans le header (liens one-click) : Sénégal · Afrique · International · Économie · Social · Notre Journal — plus Vidéos, Archives, Contact. Hamburger uniquement sur mobile.

## i18n

Bascule **FR / WO** (Wolof) pour le chrome UI. Articles principalement en français.

## Déploiement Vercel

1. Importer le dépôt GitHub `siakhabakayoko/journal-fernent`
2. Framework preset : Next.js
3. Ajouter `ADMIN_PASSWORD` (+ `TURSO_*` + optionnel `BLOB_READ_WRITE_TOKEN` + `RESEND_API_KEY` / `EMAIL_FROM` / `NEXT_PUBLIC_SITE_URL`)
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
