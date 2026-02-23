# CC Academy

Project is now split by responsibility:

- `backend/`: Express + Prisma API (`src/`, `prisma/`, `.env`, backend `package.json`)
- `frontend/`: UI files (`index.html`, static assets, frontend source files)

## Current layout

- `backend/src` - API app and routes
- `backend/prisma` - schema and seed scripts
- `frontend/index.html` - frontend entry page
- `frontend/src/styles.css` - frontend styles
- `frontend/src/main.js` - frontend behavior

## Run backend

From `backend/`:

```bash
npm install
npx prisma db push
npx prisma generate
npm run dev
```

Then open `http://localhost:5000` (or your configured `PORT` in `backend/.env`).

## Admin panel

- Frontend URL: `http://localhost:3000/admin.html`
- Login using admin mobile/password (seed default):
  - Mobile: `9999999999`
  - Password: `Admin@12345`

Admin can:

- View overview metrics (students, classes, plans, subscriptions)
- Create / edit / delete classes
- Create / edit / delete subscription plans

Note: If this is first run on a new DB, run seed from `backend/`:

```bash
npm run seed
```
