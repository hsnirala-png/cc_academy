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

## Lesson AI Teacher Phase 1

Student-facing Lesson AI Teacher is integrated only inside the lesson playback flow.

- Scope: lesson-based AI only, grounded on the current lesson transcript and lesson metadata
- Route base: `/student/ai/lesson/:lessonId/...`
- Storage: conversation history is saved in MySQL through Prisma models `AiConversation` and `AiMessage`
- Safety: AI is expected to answer only from current lesson context and fall back when transcript context is missing

### Environment

Add these backend environment variables as needed:

```bash
LESSON_AI_PROVIDER="mock"      # or "openai"
OPENAI_API_KEY=""
OPENAI_LESSON_AI_MODEL="gpt-4o-mini"
```

### Student flow

1. Open a lesson in `lesson-player.html`
2. Use the `AI Teacher` panel
3. Available quick actions:
   - Summarize lesson
   - Explain selected transcript text
   - Explain in Punjabi
   - Explain in Hindi
   - Explain in English

If the lesson transcript is missing, the AI panel stays safe and returns a grounded fallback message instead of guessing.
