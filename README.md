# BODY MASTER (Next.js + TypeScript + Tailwind + Prisma)

## Démarrage rapide

1) Créer `.env` à la racine avec:

```env
DATABASE_URL="file:./prisma/dev.db"
```

2) Installer et lancer:

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

## Base de données (SQLite + Prisma)
- Le fichier SQLite est à `prisma/dev.db`
- Variable d'env: `.env` avec `DATABASE_URL="file:./prisma/dev.db"`

Commandes utiles:
```bash
npx prisma studio        # UI de la base
npx prisma migrate dev   # migration dev
npx prisma generate      # regénérer le client
```

## API
- `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/:id`
- `GET/POST /api/coaches`, `GET/PUT/DELETE /api/coaches/:id`
- `GET/POST /api/promotions`, `GET/PUT/DELETE /api/promotions/:id`

## UI
- Page principale avec 3 sections (Clients, Coachs, Promotions)
- Boutons pour ouvrir des modales d'ajout et édition
- Style simple et professionnel via Tailwind
