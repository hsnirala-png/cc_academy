# Lesson AI Teacher Phase 1 Integration Notes

This document is intentionally non-invasive. It describes how the isolated Lesson AI scaffold should be integrated later without changing any current behavior now.

## Existing Files That Would Eventually Need Modification

- `backend/src/app.ts`
  Purpose later: mount the student AI router under the student route namespace.

- `backend/prisma/schema.prisma`
  Purpose later: add AI conversation and message models plus relations from `User` and `Lesson`.

- `frontend/lesson-player.html`
  Purpose later: add the AI Teacher panel container and message/input DOM anchors.

- `frontend/src/lesson-player.js`
  Purpose later: load or create lesson AI conversations, send messages, render replies, and connect transcript selection.

- `frontend/src/styles.css`
  Purpose later: style the AI Teacher panel and message thread.

- `backend/.env.example`
  Purpose later: document model/provider environment variables.

- `README.md`
  Purpose later: document feature usage and deployment notes.

## Exact Integration Steps For Later

1. Review the scaffold files under `backend/src/modules/ai/`, `backend/src/routes/`, and `backend/src/tests/`.
2. Add Prisma schema for `AiConversation` and `AiMessage` and generate a migration.
3. Regenerate Prisma client after schema changes.
4. Replace placeholder repository wiring in `backend/src/modules/ai/lesson-ai.service.ts` with Prisma-backed persistence.
5. Confirm lesson entitlement stays delegated to existing lesson access logic in `backend/src/modules/lessons/lesson.service.ts`.
6. Mount `studentAiRouter` in `backend/src/app.ts` under `/student`.
7. Add the AI Teacher panel markup to `frontend/lesson-player.html`.
8. Add frontend fetch/render logic in `frontend/src/lesson-player.js` using existing `apiRequest` and auth helpers from `frontend/src/mock-api.js`.
9. Add minimal styles in `frontend/src/styles.css`.
10. Run backend build and tests before any frontend rollout.
11. After UI wiring, manually verify student lesson access, transcript selection, and fallback behavior when transcript is missing.

## Duplicate / Overlap Risks

- Lesson entitlement logic already exists in `backend/src/modules/lessons/lesson.service.ts`.
  Risk: duplicating access checks inside the AI service could drift from actual lesson access rules.
  Safe approach: AI integration should call the existing lesson service for access validation.

- The repo already has admin-facing AI utilities in translation, transliteration, OpenAI TTS, and Gemini TTS services.
  Risk: mixing admin utility behavior with student AI behavior could create inconsistent provider config or error handling.
  Safe approach: keep Lesson AI provider abstraction separate, but mirror env and `AppError` patterns.

- The lesson player already supports both student and admin access paths.
  Risk: exposing a student-only AI panel to admins would create route/auth mismatch.
  Safe approach: keep backend AI routes student-only and gate frontend panel visibility by role during later integration.

- Transcript sources can come from inline lesson fields or transcript URLs.
  Risk: grounding against a frontend-only fetched transcript source would not match backend-side context.
  Safe approach: Phase 1 grounding should use only persisted lesson fields available server-side.

## Suggested Final Route Mounting Point

- Suggested router file: `backend/src/routes/student.ai.routes.ts`
- Suggested mount point in `backend/src/app.ts`: `app.use("/student", studentAiRouter);`

Suggested endpoint namespace:

- `POST /student/ai/lesson/:lessonId/conversations`
- `GET /student/ai/lesson/:lessonId/conversations/:conversationId`
- `POST /student/ai/lesson/:lessonId/conversations/:conversationId/messages`

## Suggested Prisma Schema Changes For Later

Add enum:

- `AiConversationMode`
  - `LESSON_CHAT`

Add enum:

- `AiMessageRole`
  - `USER`
  - `ASSISTANT`

Extend `User`:

- add relation `aiConversations AiConversation[]`

Extend `Lesson`:

- add relation `aiConversations AiConversation[]`

Add model `AiConversation` with:

- `id String @id @default(cuid())`
- `userId String`
- `lessonId String`
- `title String`
- `mode AiConversationMode @default(LESSON_CHAT)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- relation to `User`
- relation to `Lesson`
- relation `messages AiMessage[]`
- unique constraint on `(userId, lessonId, mode)`
- supporting indexes for lesson/user lookups

Add model `AiMessage` with:

- `id String @id @default(cuid())`
- `conversationId String`
- `role AiMessageRole`
- `content String @db.LongText`
- `contextSnapshotJson Json?`
- `tokenUsage Int?`
- `createdAt DateTime @default(now())`
- relation to `AiConversation`
- index on `(conversationId, createdAt)`

## Notes On The Current Scaffold

- The scaffold should remain isolated until route mounting, Prisma schema work, and frontend wiring are explicitly approved.
- If any import path or type in the scaffold becomes unstable during later integration, prefer small adapter functions over changing existing lesson or auth flow behavior.
