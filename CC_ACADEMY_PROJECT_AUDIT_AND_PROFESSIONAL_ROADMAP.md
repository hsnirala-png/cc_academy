# CC Academy Project Audit & Professional Roadmap

Audit date: 2026-06-03  
Scope: read-only project understanding, technical audit, UI/UX audit, business-flow audit, and professional roadmap. No source code was modified.

## 1. Executive Summary

CC Academy is already more than a basic static website. The current project has a Node.js/Express backend, Prisma/MySQL database layer, JWT authentication, Razorpay integration, product/course flows, mock tests, referrals, support queries, a tuition AI module, and a newer teacher hub foundation.

The main opportunity is not to add "AI-looking" decoration. The product needs to become a credible EdTech system with a clean information architecture, reliable payments, clear student and teacher journeys, admin controls, compliance pages, and AI teaching that is grounded in course/syllabus content.

Current strengths:

- Real backend exists with Express, TypeScript, Prisma, MySQL, JWT, bcrypt, Zod, OpenAI, Gemini TTS, and Razorpay.
- Student learning flows exist for courses, lessons, lesson progress, products, mock tests, referrals, and AI tuition.
- Tuition AI is not just a landing-page feature; it has sessions, messages, syllabus upload/review, chapter plans, progress, homework, speech tracks, and live-board style rendering.
- Teacher marketplace work has started with teacher profiles, KYC, offerings, requirements, enrollments, boards, content, notices, orders, billing cycles, ledger entries, payouts, moderation, and audit logs.
- Admin tools exist for students, classes, subscriptions, products, lessons, mock tests, referrals, sliders, support queries, tuition cache, and teacher hub moderation/operations.

Critical gaps:

- The frontend is plain HTML/CSS/JS with many page-specific files and no component system, so visual consistency and long-term maintainability are weak.
- The UI feels assembled in phases: some strong functional areas exist, but brand language, spacing, typography, navigation, cards, admin surfaces, and mobile density need a professional design system.
- The generic payment route creates Razorpay orders from client-supplied amount and must not be used for real purchases without server-side pricing/order validation.
- Teacher hub schema currently uses many string status fields and several models without explicit Prisma relations, which is acceptable for early scaffolding but not ideal for a production marketplace.
- Referral exists and should remain simple, single-level, and compliant. It should not become MLM-style chain income.
- Compliance, trust, refund, terms, privacy, teacher agreement, student safety, and pricing pages are missing or incomplete for a serious paid education platform.
- Runtime schema repair helpers and raw SQL table creation are useful during development, but production should move toward migration-owned schema and consistent Prisma models.

Final recommendation: first stabilize the product foundation, then polish student paid enrollment and PSTET AI Teacher MVP, then add teacher marketplace and payout systems in controlled phases. Do not expand to UPSC/JEE/NEET until PSTET and tuition AI flows are reliable, testable, and visually professional.

## 2. Current Tech Stack Found

Frontend:

- Plain HTML/CSS/JavaScript, not React/Vue/Angular/Next.
- Main entry and pages live under `frontend/`.
- Shared styling is mainly in `frontend/src/styles.css`.
- Teacher hub has separate CSS in `frontend/src/teacher-hub.css`.
- JavaScript modules are page-specific, for example dashboard, products, checkout, lessons, mock tests, referrals, tuition, admin, and teacher hub.

Backend:

- Node.js with Express and TypeScript.
- Main app wiring is in `backend/src/app.ts`.
- Backend entry is `backend/src/server.ts`.
- Validation uses Zod.
- Password hashing uses bcrypt.
- Authentication uses JWT.
- Payment SDK is Razorpay.
- AI dependencies include OpenAI and Gemini TTS related services.

Database and ORM:

- Prisma ORM.
- MySQL datasource.
- Prisma schema at `backend/prisma/schema.prisma`.
- Migrations at `backend/prisma/migrations/`.
- Some additional/legacy tables and columns are created or repaired at runtime through storage helpers using raw SQL.

Authentication:

- Register/login with mobile and password.
- JWT Bearer token middleware.
- Roles currently include `ADMIN` and `STUDENT`.
- Teacher hub does not have a separate Prisma `TEACHER` role; teacher access is handled through teacher profile/status and feature gates.

Payment:

- Razorpay client configuration exists.
- Generic `/api/payment/order` and `/api/payment/verify` routes exist.
- Product purchase and teacher hub order/payment logic exist separately.

Admin panel:

- Admin login and admin pages exist.
- Admin manages overview, users/students, classes, subscriptions, products, lessons, mock tests, referrals, sliders, contact queries, tuition cache, and teacher hub operations.

Student panel:

- Dashboard, products, checkout, lessons, lesson player, subscriptions, profile, support, mock tests/history/attempts, referral pages, tuition syllabus/chapter/teacher/homework pages.

Teacher-related features:

- Teacher hub foundation exists with teacher profile, KYC, payout account, offerings, batches, enrollments, boards, content, notices, student requirements, student views, admin moderation, payouts, feature flags, and billing.

AI teacher files:

- Backend tuition AI services in `backend/src/modules/tuition/`.
- Frontend AI pages include `frontend/ai-teacher.html`, `frontend/tuition-teacher.html`, `frontend/tuition-chapters.html`, `frontend/tuition-homework.html`, `frontend/tuition-syllabus-upload.html`, and `frontend/tuition-syllabus-review.html`.

## 3. Existing Project Structure

Top-level:

- `backend/`: Express + Prisma API.
- `frontend/`: static frontend pages, assets, JavaScript, and CSS.
- `node_modules/`: present at root.
- Temporary browser verification folders and screenshots are present from prior UI/test work.
- `README.md`: documents split backend/frontend layout and admin seed login.

Backend important folders:

- `backend/src/routes/`: API route definitions.
- `backend/src/modules/`: domain services for lessons, mock tests, referrals, students, teacher hub, and tuition.
- `backend/src/middlewares/`: authentication, role access, error handling, teacher hub access.
- `backend/src/services/`: audio, TTS, translation/transliteration, transcript helpers, storage.
- `backend/src/utils/`: Prisma helper, JWT, public assets, storage repair helpers, product/referral/mock/slider storage, teacher hub policy/sanitization.
- `backend/src/tests/`: backend tests for mock-test scoring and tuition AI provider.
- `backend/prisma/`: schema, migrations, seed.

Frontend important folders/files:

- `frontend/index.html`: home page.
- `frontend/src/styles.css`: main shared styling.
- `frontend/src/main.js`: home behavior.
- `frontend/src/mock-api.js`: shared API/auth helper.
- `frontend/src/global-nav.js`: navigation behavior.
- `frontend/src/teacher-hub.css`: teacher hub styling.
- Many static pages for admin, student, tuition, mock tests, products, checkout, support, referrals, and teacher hub.
- `frontend/public/`: images, PDF, uploads, audio, transcripts, icons.

Environment/config:

- `backend/.env.example`: database, JWT, port, maintenance, OpenAI, Gemini, transliteration, public asset path.
- `backend/.env`: present locally and should not be exposed.
- `backend/tsconfig.json`, `backend/prisma/tsconfig.json`.

## 4. Existing Features Found

Student and auth:

- Student registration with mobile, name, state, city, password, optional referral code.
- Mock-referral registration with email and mock-test gate support.
- Login by mobile/password.
- Mobile existence check and sponsor lookup.
- Student code/referral code helpers.

Courses and lessons:

- Courses, chapters, lessons, enrollments, lesson progress.
- Lesson audio generation and preview.
- Transcript text/segments and audio metadata.
- Lesson-to-mock-test linking.

Products and paid access:

- Product catalog with exam category, exam name, course type, language mode, pricing, thumbnails, validity, add-ons, referral bonus/discount.
- Product purchase records.
- Product mock-test linking, demo mock tests, combo/package support, trial claims, student product access through runtime-created tables.
- Checkout pages and frontend purchase flows.

Mock tests:

- Admin CRUD for mock tests, sections, questions, CSV import, attempts.
- Student list, registration gates, attempt creation, answers, submission, history.
- Scoring tests exist.
- Question snapshots/archive columns are added through storage helpers.

Referral:

- Referral code per student.
- Referrer relation on user.
- Referral transactions, payout methods, withdrawals, admin approval/rejection.
- Product purchase and wallet usage are represented.

Support/contact:

- Public contact submission.
- Student contact queries.
- Admin contact query inbox with messages and status.

Tuition AI:

- Tuition board and subject seed data.
- Tuition profile with board/class/subject/language preferences.
- Syllabus upload, parse, review, confirm.
- Syllabus chapters, chapter plan, sessions, messages, progress.
- AI teacher context with language, board language, voice language, speed, difficulty, teaching depth.
- Homework generation/submission/evaluation payloads.
- Tuition lesson cache and doubt cache.
- Live-board style payloads and speech tracks.
- Optional voice session path using OpenAI realtime configuration.

Teacher hub:

- Teacher feature flags.
- Teacher profile, KYC, payout account.
- Teacher offerings and policies.
- Student teacher requirements.
- Teacher enrollments, batches, batch students.
- Teacher boards, board sessions, whiteboard/file artifacts.
- Teacher content, content attachments, notices, notice recipients.
- Teacher orders, billing cycles, ledger entries, payouts.
- Moderation flags and teacher audit logs.
- Admin teacher hub pages for overview, teachers, offerings, payouts, and moderation.
- Student teacher hub pages for requirements, enrollments, content, notices, and board.
- Teacher pages for dashboard, profile, offerings, and board.

## 5. Missing Critical Features

Business/trust pages:

- About.
- Contact page exists/support exists, but it should be upgraded into a polished trust page with address/contact/legal details.
- Privacy Policy.
- Terms and Conditions.
- Refund Policy.
- Teacher Agreement.
- Student Safety policy.
- Pricing.
- FAQs.
- Success Stories.
- Demo Class page.
- Grievance/complaint policy.

Professional product capabilities:

- Clear student onboarding wizard by goal/exam/class/subject/language.
- Unified student dashboard showing purchased courses, mock tests, AI teacher sessions, homework, support, referral wallet.
- Production-grade course enrollment and payment lifecycle.
- Admin reporting for revenue, refunds, referrals, teacher payouts, active students, AI usage cost.
- Notifications through email/SMS/WhatsApp.
- Audit logs for payment/referral/admin changes.
- Content moderation and complaint/refund workflow.

AI teacher gaps:

- No admin-managed AI teacher personalities found as first-class models.
- No explicit AI prompt version table or admin prompt control table found.
- Guardrails are partially present through structured tuition context, but full retrieval-grounded course-content guardrails are not clearly complete.
- No robust weakness-tracking model for topic-level mastery across exams.
- No full AI MCQ explanation engine tied to every mock attempt result as a distinct service.
- Voice exists as optional/realtime and speech-track feature, but a complete production voice classroom requires cost control, fallback, latency handling, and analytics.

Teacher marketplace gaps:

- Teacher approval exists, but marketplace discovery/search/filtering is not mature.
- Qualification verification and document handling need stronger privacy/security.
- Availability calendar, class booking, rescheduling, cancellation, and refund flows are missing or early.
- Teacher-student chat rules are not clearly implemented.
- Live class scheduling and recording are not fully present.
- Ratings/reviews and safety reporting are missing.
- Teacher payout lifecycle exists structurally but needs compliance, invoice, tax, refund adjustment, dispute, and audit hardening.

## 6. UI/UX Professional Audit

What looks promising:

- The home page has real navigation, course search, course select, product cards, exam exploration, referral CTA, and visual assets.
- The tuition teacher page has a serious interactive product surface: language/depth/speed controls, live board, doubt input, quick actions, voice, homework, and session state.
- Admin pages are functional and data-oriented.
- Teacher hub pages exist for separate teacher/student/admin contexts.

What looks unfinished or AI-generated:

- Home hero copy is generic: "Learn Anywhere. Achieve Everywhere." and "fastest growing online AI learning platform" sounds broad and unverifiable.
- Brand spelling is inconsistent in places (`CC Acadeemy` in page title/assets).
- The announcement bar shows mojibake (`â€¢`) instead of a proper bullet, which harms trust immediately.
- Several UI surfaces overuse blue gradients, rounded cards, pills, and soft shadows, making the product feel assembled rather than system-designed.
- Teacher hub CSS uses 16px card radii and generic white cards, while the requested direction needs restrained professional EdTech quality.
- Navigation is crowded on the home page: logo, course select, search, referral, products, testimonials, contact, signup/login, mobile-specific controls.
- Some buttons use text where icon+tooltip would be better for compact tools.
- Admin and student surfaces do not yet feel like one coherent design system.

Spacing/layout concerns:

- Header height and logo sizing are large and may reduce first-viewport content.
- Hero uses split text/media plus scroll gallery, but the value proposition and product proof are not focused enough.
- Many page sections are card-heavy; operational SaaS-style surfaces should use dense, organized layouts with cards only for repeated items or framed tools.
- Mobile navigation appears complex and should be simplified into a clear app-like menu.

Typography:

- System font stack is acceptable but should be made intentional.
- Headings, compact panels, dashboard cards, and forms need a consistent scale.
- Avoid oversized hero-scale type inside tool panels.
- Letter spacing should remain normal; avoid negative tracking.

Color:

- Current palette is blue-heavy: `#0f53bd`, blue borders, blue shadows, blue soft backgrounds.
- Blue can remain as brand primary, but it needs neutral grays, success/warning/error colors, and a secondary accent used sparingly.
- Avoid a one-note blue UI across every page.

Forms/buttons:

- Forms exist but need consistent labels, validation states, help text, disabled/loading states, and success/error messaging.
- CTA hierarchy should be strict: one primary per flow, secondary for alternatives, ghost/icon for tools.

Trust elements missing:

- Real teacher/institution proof.
- Refund/legal policy links near checkout.
- Payment security copy.
- Course outcome/syllabus proof.
- Student testimonials with attribution.
- Demo class and sample lesson entry points.
- Contact details and complaint escalation.

## 7. AI Teacher Audit

Already present:

- Tuition syllabus upload/review/chapters.
- AI tuition session creation/resume.
- Student messages/doubts.
- AI response payloads with teacher state and board state.
- Language controls for English, Hindi, Punjabi.
- Separate explanation language, board language, and voice language.
- Teaching depth, speed, difficulty controls.
- Homework generation and submission.
- Lesson/doubt cache.
- Speech track generation and exact live-board sync attempts.
- Optional realtime voice session configuration.
- Subject-family logic and topic overrides for selected subjects/topics.

Missing or incomplete:

- First-class AI teacher/agent selection. The user wants students to switch AI teacher style/personality; current controls are teaching settings, not named teacher agents.
- Admin-managed AI teacher profiles with prompt/personality, language, exam focus, grade level, and enable/disable status.
- Prompt versioning and testing workflow.
- Course-content grounding controls: strict retrieval from lesson transcript/syllabus/question bank, citation/source display, and "outside content" refusal strategy.
- Hallucination monitoring and admin review of risky answers.
- Weakness tracking as a durable student mastery model.
- Revision-plan engine based on mistakes, lesson progress, and mock history.
- AI MCQ explanation engine tied to mock test attempts and question metadata.
- Cost/latency control: quotas, caching policy, fallback provider, admin usage dashboard.
- Voice classroom moderation and safety rules.

Recommended AI architecture:

- `AiTeacherProfile`: name, avatar, language style, teaching method, prompt version, allowed exams/classes/subjects, active flag.
- `AiPromptVersion`: prompt text, guardrail rules, model, temperature, retrieval policy, admin author, status.
- `StudentMasteryTopic`: user, exam, subject, topic, level, confidence, last assessed, weak/strong flags.
- `AiTutorSession`: linked to course/chapter/mock/topic, teacher profile, prompt version, model/provider, cost/latency metadata.
- `AiTutorMessage`: question, answer, source context, moderation flags, hallucination risk, feedback.
- `AiExplanationSource`: transcript/question/content references used by AI.

## 8. Human Teacher Marketplace Audit

Already present:

- Teacher profile and status.
- KYC record and payout account.
- Teacher offerings with mode, subject, board, class level, cycle price, demo price, batch capacity.
- Offering policy.
- Student requirements.
- Teacher enrollments.
- Batches and batch students.
- Teacher boards, board sessions, artifacts.
- Teacher content and attachments.
- Teacher notices and recipients.
- Teacher orders, billing cycles, ledger entries, payouts.
- Admin overview, teacher approval/status, KYC, payout accounts, offerings, payouts, moderation.
- Feature flag rollout for phased access.

Missing or early:

- Teacher role as a clean RBAC concept.
- Public teacher marketplace discovery/search.
- Teacher profile quality: verified badges, subjects, languages, teaching style, demo video, experience, qualifications, availability, student outcomes.
- Document upload security for KYC.
- Availability calendar and class booking.
- Live class provider integration.
- Recording storage/access policy.
- Student-teacher chat with communication rules.
- Ratings/reviews.
- Complaint/refund/dispute workflows.
- Teacher agreement acceptance.
- Tax/GST/invoice records.
- Payout hold periods and refund adjustments.

Recommendation:

- Keep teacher hub behind feature flags until teacher onboarding, KYC, marketplace browsing, booking, payment, refund, complaint, and payout flows are hardened.
- Use teacher hub first for controlled internal teachers, then expand to external teachers.

## 9. Referral/Commission System Audit

Already present:

- Student referral code and referrer relation.
- Sponsor lookup.
- Referral transactions.
- Payout methods.
- Withdrawal requests.
- Admin withdrawal approval/rejection.
- Product referral bonus and discount fields.
- Wallet usage for product purchase.
- Mock-test registration referral bonus support.

Missing:

- Clear wallet ledger UI with opening/closing balance per entry.
- Anti-fraud checks: duplicate device/mobile/email/payment method/IP, self-referral checks, suspicious velocity.
- Referral eligibility rules: bonus only after successful paid purchase and refund window.
- Withdrawal minimum, cooldown, KYC, tax declaration, payment proof.
- Refund adjustment entries.
- Course-wise commission reporting.
- GST/invoice records.
- Admin export/reporting.

Compliance recommendation:

- Keep referral strictly single-level.
- Do not add multi-level/referral-chain income.
- Use simple cashback/reward wording tied to actual purchases.
- Add visible terms: eligibility, withdrawal minimum, fraud rejection, refund reversal, no guaranteed income.

Commission:

- Product referral rewards exist conceptually.
- Teacher platform commission exists as `TEACHER_HUB_PLATFORM_FEE_PERCENT = 12`.
- Teacher payout ledger exists, but production payout needs stronger accounting: paid order, refund, adjustment, settlement, invoice, payout proof, and admin audit.

## 10. Backend/API/Database Audit

Existing Prisma models:

- Core: `User`, `Course`, `Chapter`, `Lesson`, `Enrollment`, `LessonProgress`.
- Commerce: `Product`, `ProductPurchase`, `CoachingClass`, `SubscriptionPlan`, `StudentSubscription`.
- Mock tests: `MockTest`, `MockTestSection`, `Question`, `Attempt`, `AttemptQuestion`, `AttemptAnswer`.
- Referral/contact: `ReferralPayoutMethod`, `ReferralWithdrawal`, `ReferralTransaction`, `ContactConversation`, `ContactMessage`.
- Tuition AI: `TuitionBoard`, `TuitionSubject`, `TuitionProfile`, `TuitionSyllabusUpload`, `TuitionSyllabus`, `TuitionSyllabusChapter`, `TuitionChapterPlan`, `TuitionSession`, `TuitionMessage`, `TuitionProgress`, `TuitionHomework`, `TuitionHomeworkSubmission`, `TuitionLessonCache`, `TuitionLessonDoubt`.
- Teacher hub: `TeacherFeatureFlagRollout`, `TeacherProfile`, `TeacherKyc`, `TeacherPayoutAccount`, `TeacherOffering`, `TeacherOfferingPolicy`, `TeacherRequirement`, `TeacherEnrollment`, `TeacherBatch`, `TeacherBatchStudent`, `TeacherBoard`, `TeacherBoardSession`, `TeacherBoardArtifact`, `TeacherContentItem`, `TeacherContentAttachment`, `TeacherNotice`, `TeacherNoticeRecipient`, `TeacherOrder`, `TeacherBillingCycle`, `TeacherLedgerEntry`, `TeacherPayout`, `TeacherModerationFlag`, `TeacherAuditLog`.

Existing routes:

- `/health`
- `/auth/register`, `/auth/mock-referral-register`, `/auth/login`, `/auth/check-mobile`, `/auth/sponsor-lookup`
- `/me`
- `/admin/*` for overview, users, classes, subscriptions, lessons, mock tests, contact queries, explore, products, referrals, sliders, translation/transliteration, teacher hub, tuition
- `/api/admin/*` aliases for several admin modules
- `/student/mock-tests`, `/student/attempts`, `/student/history`, mock registration flows
- `/student/tuition/*` for tuition bootstrap/profile/uploads/chapters/sessions/homework/voice/speech/messages
- `/teacher-hub/*` for teacher profile/KYC/payout account/offerings/batches/enrollments/boards/content/notices/payouts
- `/api/student/teacher-hub/*` for student teacher hub requirements/enrollments/notices/content/boards/orders/payment
- `/products/*`
- `/api/payment/order`, `/api/payment/verify`
- `/api/referrals/*`
- `/api/contact`, `/api/explore-sections`, `/api/lessons/*`, `/api/sliders`

Backend concerns:

- Generic payment order route accepts arbitrary `amount` from the client. For real purchases, all payable amounts must be computed server-side from product/order records.
- CORS is open by default with `app.use(cors())`; production should restrict origins.
- JSON body limit is 50mb globally. Large uploads should be routed through controlled upload endpoints/storage with auth and size/type limits.
- Runtime schema helpers create/alter tables during API execution. Move toward Prisma migrations for production.
- Raw SQL usage is widespread. Some queries are parameterized, but `$queryRawUnsafe`/`$executeRawUnsafe` should be reduced.
- Teacher hub statuses are string fields, not enums, increasing typo/regression risk.
- Many teacher hub models do not define Prisma relations, which weakens query safety and cascade clarity.
- No rate limiting found for auth, payment, support, AI, or referral endpoints.
- No OTP verification for mobile/email found.
- No password reset flow found.
- No refresh token/session revocation strategy found.
- No centralized audit logging for admin actions outside teacher hub.
- No explicit backup/restore routine found.

Missing backend models/routes:

- Legal page content management.
- Payment order/refund/invoice/webhook models for all product purchases.
- Razorpay webhook handler with idempotency.
- AI teacher profile and prompt version models.
- Student mastery/weakness/revision plan models.
- Notification models.
- Complaint/refund/dispute models.
- Teacher availability/booking/live class/recording/review models.
- Tax/GST/invoice models.

## 11. Security & Compliance Concerns

Highest priority:

- Never trust client amount for payments.
- Add Razorpay webhook verification and idempotent payment status updates.
- Add rate limits to login/register/sponsor lookup/contact/AI/payment endpoints.
- Restrict production CORS origins.
- Add OTP verification for mobile/email before paid enrollment/referral withdrawal.
- Protect KYC/payout data with strict access controls and masked display.
- Avoid storing sensitive account/document details in plain JSON without a privacy plan.

Important:

- Add refund policy and refund adjustment ledger.
- Add privacy policy and terms before scaling.
- Add teacher agreement and student safety policy before opening marketplace.
- Add admin audit logs for product price changes, payment changes, referral/payout approvals, teacher approvals, and AI prompt changes.
- Add backup, restore, and migration runbook.
- Add structured logging and error monitoring.
- Add AI safety: refusal for non-course content when in course-grounded mode, abuse detection, answer feedback, and admin review.

## 12. Recommended Professional Architecture

Frontend:

- Short term: keep static HTML/JS but create a design system layer in CSS and shared JS helpers.
- Medium term: migrate to a component framework if the platform continues to expand. React/Next or another framework would reduce duplication across dashboards, admin forms, product cards, and teacher hub views.
- Create shared components/conventions: header, sidebar, page shell, data table, form field, toast, modal, tabs, status badge, empty state, course card, teacher card, metric tile.

Backend:

- Keep Express/TypeScript/Prisma.
- Move runtime schema repair into migrations.
- Split domains cleanly:
  - Auth/users
  - Catalog/courses/lessons
  - Commerce/payments/refunds/invoices
  - Mock tests/assessment
  - AI tuition
  - Teacher marketplace
  - Referral/wallet
  - Admin/reporting
  - Support/complaints

Database:

- Use Prisma enums for statuses where possible.
- Add relations for teacher hub models.
- Add audit and ledger tables for payment/referral/teacher payout.
- Add webhook event table.
- Add AI prompt/profile/session/cost/source tables.

AI:

- Use course content and syllabus as the source of truth.
- Store prompt versions and AI teacher profiles.
- Track AI cost, latency, provider, model, prompt version, and source context.
- Add admin controls for enabling/disabling AI teacher profiles and reviewing answer quality.

Payments:

- Use server-created order records.
- Compute amount from product/offering on server.
- Verify payment through signature and webhook.
- Grant access only after verified paid status.
- Record refunds, invoice, wallet adjustments, referral bonus adjustment, teacher commission adjustment.

## 13. Phase-wise Development Roadmap

### Phase 1: Project cleanup and professional UI foundation

Goal:

- Make CC Academy look and feel like a serious EdTech brand while preserving current functionality.

Required features:

- Design tokens: colors, typography, spacing, radius, shadows, buttons, forms, tables, cards, badges.
- Consistent header/sidebar/page shell for public, student, admin, teacher.
- Fix obvious trust issues such as mojibake, inconsistent brand spelling, cramped navigation.
- Add missing static trust pages placeholders with final-ready structure.

Files likely to change:

- `frontend/src/styles.css`
- `frontend/src/global-nav.js`
- `frontend/index.html`
- Admin/student/teacher page shells
- Public policy/trust pages

New files likely:

- `frontend/about.html`
- `frontend/contact.html` or improved support page
- `frontend/privacy-policy.html`
- `frontend/terms.html`
- `frontend/refund-policy.html`
- `frontend/teacher-agreement.html`
- `frontend/student-safety.html`
- `frontend/pricing.html`
- `frontend/faqs.html`
- `frontend/demo-class.html`

Backend changes:

- Minimal; maybe routes for legal/support page content later.

Frontend changes:

- Shared layout, page shells, refined visual system, improved mobile navigation.

Database changes:

- None initially.

Complexity:

- Medium.

Development order:

1. Define CSS tokens and component classes.
2. Fix public header/hero/navigation/trust pages.
3. Normalize dashboard/admin layout.
4. Normalize cards/forms/buttons/tables.
5. Verify mobile views.

Testing checklist:

- Desktop and mobile screenshots.
- Header/menu/search/login behavior.
- No text overlap.
- Forms remain usable.
- Existing routes/pages still load.

### Phase 2: Student registration/login + course enrollment polish

Goal:

- Make student signup, login, product browsing, checkout, and enrollment reliable and trustworthy.

Required features:

- Cleaner signup/login forms.
- Email/mobile capture with OTP plan.
- Course/product details pages with pricing, validity, syllabus, demo, refund link.
- Server-side checkout validation.
- Student dashboard showing active products/courses/mock tests.

Files likely to change:

- `backend/src/routes/auth.routes.ts`
- `backend/src/routes/products.routes.ts`
- `backend/src/routes/payment.routes.ts`
- `frontend/products.html`
- `frontend/checkout.html`
- `frontend/dashboard.html`
- `frontend/src/products.js`
- `frontend/src/checkout.js`
- `frontend/src/dashboard.js`

New files likely:

- Payment order/refund/invoice services.
- Checkout success/failure pages.
- OTP service module if implemented.

Backend changes:

- Server-side order model, payment verification hardening, access grant after verified payment.

Frontend changes:

- Professional product and checkout pages with clear legal/trust links.

Database changes:

- Payment order, payment event/webhook, invoice/refund tables.

Complexity:

- High.

Development order:

1. Audit current product purchase flow.
2. Add server-side order calculation.
3. Harden Razorpay verification/webhooks.
4. Polish checkout UI.
5. Update dashboard purchased access.

Testing checklist:

- Login/register validation.
- Product list/details.
- Checkout preview.
- Razorpay order amount cannot be tampered.
- Verified payment grants access once.
- Failed payment does not grant access.

### Phase 3: PSTET/CC Academy AI Teacher MVP

Goal:

- Turn current tuition AI into a focused PSTET AI Teacher MVP with professional teaching flow.

Required features:

- AI teacher profile selection.
- PSTET content-grounded lesson explanations.
- English/Hindi/Punjabi/bilingual modes.
- Simple, example, repeat, continue, ask doubt controls.
- Admin-configurable teacher profiles and prompt versions.

Files likely to change:

- `backend/src/modules/tuition/tuition-ai.provider.ts`
- `backend/src/modules/tuition/tuition-ai.service.ts`
- `backend/src/routes/student.tuition.routes.ts`
- `backend/src/routes/admin.tuition.routes.ts`
- `frontend/tuition-teacher.html`
- `frontend/src/tuition-teacher.js`
- `frontend/src/styles.css`

New files likely:

- AI teacher profile admin page.
- AI prompt version service/routes.
- AI source/guardrail utility.

Backend changes:

- Teacher profile/prompt models, source-grounded response contract.

Frontend changes:

- Teacher selection UI, clearer lesson flow, answer quality feedback.

Database changes:

- AI teacher profile, prompt version, AI session metadata, AI message feedback/source tables.

Complexity:

- High.

Development order:

1. Define AI teacher profile model.
2. Define prompt/source contract.
3. Add admin profile/prompt controls.
4. Add student teacher selection.
5. Add feedback and basic analytics.

Testing checklist:

- Teacher switch changes style but keeps correctness.
- AI stays inside lesson/syllabus context.
- Punjabi/Hindi/English render correctly.
- Doubt flow resumes lesson.
- Empty/malformed AI response fallback works.

### Phase 4: Mock test + AI explanation engine

Goal:

- Make mock tests a learning engine, not only an assessment engine.

Required features:

- Attempt result explanations by question.
- Weak area detection by subject/topic/section.
- Revision suggestions.
- AI explanation from stored question/explanation/course context.

Files likely to change:

- `backend/src/modules/mock-tests/*`
- `backend/src/routes/student.mock-tests.routes.ts`
- `backend/src/routes/admin.mock-tests.routes.ts`
- `frontend/mock-attempt.html`
- `frontend/mock-history.html`
- `frontend/src/mock-attempt.js`
- `frontend/src/mock-history.js`

New files likely:

- Mock AI explanation service.
- Student mastery service.

Backend changes:

- Explanation generation/caching and mastery updates.

Frontend changes:

- Result review UI with explanation, concept, exam approach, next revision.

Database changes:

- Mock explanation cache, topic tags, student mastery/weakness records.

Complexity:

- High.

Development order:

1. Add topic/skill tagging to questions.
2. Store explanation cache.
3. Add result review UI.
4. Update mastery after attempt.
5. Add revision recommendations.

Testing checklist:

- Correct scoring unchanged.
- Explanations match correct answer.
- Weakness records update predictably.
- AI does not invent answer choices.

### Phase 5: Admin AI teacher management

Goal:

- Let admin control AI teachers, prompts, guardrails, cost, and quality.

Required features:

- AI teacher profiles CRUD.
- Prompt versioning and publish workflow.
- Model/provider selection.
- Usage/cost dashboard.
- Answer review and safety flags.

Files likely to change:

- `backend/src/routes/admin.tuition.routes.ts`
- `backend/src/modules/tuition/*`
- `frontend/admin-tuition-cache.html`
- `frontend/src/admin-tuition-cache.js`
- New admin AI teacher page.

New files likely:

- `frontend/admin-ai-teachers.html`
- `frontend/src/admin-ai-teachers.js`
- Backend AI admin service/routes.

Backend changes:

- Prompt/version/profile APIs, answer review APIs.

Frontend changes:

- Admin tables/forms for AI teachers and prompt versions.

Database changes:

- AI teacher profile, prompt version, usage logs, review logs.

Complexity:

- Medium-high.

Development order:

1. Add models.
2. Add admin APIs.
3. Build admin UI.
4. Connect student AI teacher selection.
5. Add usage metrics.

Testing checklist:

- Draft prompt does not affect students.
- Published prompt is versioned.
- Disabled teacher cannot be selected.
- Usage logs record provider/model.

### Phase 6: Human teacher registration and approval

Goal:

- Prepare a controlled teacher onboarding flow.

Required features:

- Teacher registration intent/profile.
- KYC and qualifications.
- Subject/exam/class/language selection.
- Admin approval/rejection with notes.
- Teacher agreement acceptance.

Files likely to change:

- `backend/src/routes/teacher-hub.routes.ts`
- `backend/src/routes/admin.teacher-hub.routes.ts`
- `backend/src/modules/teacher-hub/*`
- `frontend/teacher-hub-teacher-profile.html`
- `frontend/admin-teacher-hub-teachers.html`
- `frontend/src/teacher-hub-teacher-profile.js`
- `frontend/src/admin-teacher-hub-teachers.js`

New files likely:

- Teacher agreement page.
- Qualification/document upload service.

Backend changes:

- Stronger KYC, agreement, approval audit.

Frontend changes:

- Guided teacher onboarding and admin review.

Database changes:

- Teacher qualification, agreement acceptance, document metadata.

Complexity:

- Medium-high.

Development order:

1. Define approval criteria.
2. Improve teacher profile form.
3. Add qualification/KYC handling.
4. Add admin decision workflow.
5. Add audit logs.

Testing checklist:

- Pending teacher cannot publish offerings.
- Rejected teacher sees reason.
- Approved teacher can proceed.
- KYC data is masked.

### Phase 7: Student-teacher booking system

Goal:

- Let students find teachers and book demo/live classes safely.

Required features:

- Teacher marketplace search.
- Availability calendar.
- Demo class booking.
- Live class schedule.
- Student-teacher communication rules.
- Complaint/refund path.

Files likely to change:

- Teacher hub routes/services.
- Student teacher hub pages.
- Teacher dashboard/offerings pages.

New files likely:

- Teacher marketplace page.
- Booking service/routes.
- Calendar UI scripts.

Backend changes:

- Availability, booking, schedule, cancellation, communication rules.

Frontend changes:

- Teacher listing, teacher profile, booking UI, schedule views.

Database changes:

- TeacherAvailability, TeacherBooking, TeacherClassSession, TeacherReview, TeacherComplaint.

Complexity:

- High.

Development order:

1. Marketplace listing.
2. Availability.
3. Booking.
4. Schedule dashboards.
5. Complaint/refund flow.

Testing checklist:

- Student cannot double-book.
- Teacher cannot exceed capacity.
- Cancel/reschedule rules work.
- Admin can see disputes.

### Phase 8: Payment, commission, payout, referral wallet

Goal:

- Make money flows auditable and compliant.

Required features:

- Server-side order pricing.
- Razorpay webhook.
- Product and teacher order ledger.
- Referral wallet ledger.
- Teacher payout settlement.
- Refund adjustment.
- GST/invoice records.
- Anti-fraud controls.

Files likely to change:

- Payment/product/referral/teacher billing routes and services.
- Admin referral and teacher payout pages.
- Checkout UI.

New files likely:

- Payment service.
- Webhook route.
- Ledger service.
- Invoice service.
- Fraud rules service.

Backend changes:

- Payment order lifecycle and immutable ledgers.

Frontend changes:

- Wallet ledger, payout status, invoice/refund display.

Database changes:

- PaymentOrder, PaymentEvent, Refund, Invoice, WalletLedger, TeacherSettlement, FraudFlag.

Complexity:

- High.

Development order:

1. Centralize payment order model.
2. Add webhook/idempotency.
3. Add ledgers.
4. Add referral/teacher adjustments.
5. Add reports.

Testing checklist:

- Tampered amount rejected.
- Duplicate webhook does not duplicate access/reward.
- Refund reverses access/reward/commission.
- Payout cannot exceed ledger balance.

### Phase 9: Multi-exam expansion: UPSC/JEE/NEET/Boards

Goal:

- Expand only after PSTET flow is stable.

Required features:

- Exam taxonomy.
- Subjects/topics/syllabus by exam.
- Course templates.
- AI prompt specializations by exam.
- Mock patterns per exam.

Files likely to change:

- Product/course/mock/tuition admin and student pages.
- Database taxonomy models.
- AI teacher source/guardrail rules.

New files likely:

- Exam taxonomy service.
- Syllabus importer.
- Exam-specific landing/catalog pages.

Backend changes:

- Exam/category/topic hierarchy.

Frontend changes:

- Catalog filters, exam pages, dashboard segmentation.

Database changes:

- Exam, Subject, Topic, SyllabusVersion, CourseExamMapping.

Complexity:

- High.

Development order:

1. Define taxonomy.
2. Migrate PSTET into taxonomy.
3. Add one new exam family.
4. Validate AI/mocks/courses.
5. Repeat by exam.

Testing checklist:

- PSTET remains unchanged.
- Filters work.
- AI uses correct exam context.
- Mock pattern is exam-specific.

### Phase 10: Voice/whiteboard/advanced AI classroom

Goal:

- Build a high-quality interactive AI classroom after core flows are stable.

Required features:

- Low-latency voice teaching.
- Whiteboard drawing/explanations.
- Lesson transcript sync.
- Student speech input.
- Teacher persona voice.
- Session recording/transcript.
- Cost and abuse controls.

Files likely to change:

- Tuition AI services.
- TTS/realtime services.
- Tuition teacher frontend.
- Admin AI controls.

New files likely:

- Voice session manager.
- Whiteboard renderer.
- AI classroom analytics.

Backend changes:

- Realtime session lifecycle, speech transcript storage, cost tracking.

Frontend changes:

- Full classroom UI with board, voice, transcript, controls, feedback.

Database changes:

- VoiceSession, WhiteboardEvent, AiClassroomRecording, AiUsageCost.

Complexity:

- Very high.

Development order:

1. Stabilize text-first AI teacher.
2. Add reliable speech track.
3. Add realtime voice pilot.
4. Add whiteboard events.
5. Add analytics/cost controls.

Testing checklist:

- Voice fallback works.
- Board never renders blank.
- Mobile layout fits.
- Cost limits trigger.
- Session can resume.

## 14. First 30 Days Action Plan

Week 1:

- Freeze feature expansion.
- Fix visible trust issues: brand spelling, mojibake, header clutter, public page copy.
- Define design tokens and reusable UI classes.
- Add or polish legal/trust pages.
- Document all current routes, pages, and database models.

Week 2:

- Polish student dashboard, product cards, checkout page, and course detail flow.
- Harden payment amount calculation design.
- Add missing checkout legal links and success/failure states.
- Add mobile UI pass for home, products, checkout, dashboard.

Week 3:

- Focus PSTET AI Teacher MVP.
- Add AI teacher profile concept and student-facing selection design.
- Define course-content grounding rules.
- Add admin-side prompt/profile plan.
- Add feedback capture for AI answers.

Week 4:

- Improve mock test result review and basic weakness tracking design.
- Prepare teacher hub approval/onboarding plan.
- Create payment/referral/teacher payout ledger architecture.
- Finalize phase 2/3 implementation prompts.

## 15. Files/Folders Most Important for Next Development

Backend:

- `backend/src/app.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/src/routes/auth.routes.ts`
- `backend/src/routes/products.routes.ts`
- `backend/src/routes/payment.routes.ts`
- `backend/src/routes/student.tuition.routes.ts`
- `backend/src/routes/admin.tuition.routes.ts`
- `backend/src/routes/student.mock-tests.routes.ts`
- `backend/src/routes/admin.mock-tests.routes.ts`
- `backend/src/routes/referrals.routes.ts`
- `backend/src/routes/admin.referrals.routes.ts`
- `backend/src/routes/teacher-hub.routes.ts`
- `backend/src/routes/student.teacher-hub.routes.ts`
- `backend/src/routes/admin.teacher-hub.routes.ts`
- `backend/src/modules/tuition/`
- `backend/src/modules/mock-tests/`
- `backend/src/modules/teacher-hub/`
- `backend/src/utils/productStorage.ts`
- `backend/src/utils/mockTestAccessStorage.ts`
- `backend/src/utils/referralStorage.ts`

Frontend:

- `frontend/index.html`
- `frontend/src/styles.css`
- `frontend/src/main.js`
- `frontend/src/mock-api.js`
- `frontend/src/global-nav.js`
- `frontend/products.html`
- `frontend/checkout.html`
- `frontend/dashboard.html`
- `frontend/lesson-player.html`
- `frontend/mock-attempt.html`
- `frontend/mock-history.html`
- `frontend/tuition-teacher.html`
- `frontend/src/tuition-teacher.js`
- `frontend/src/teacher-hub.css`
- `frontend/teacher-hub-*.html`
- `frontend/admin-*.html`

## 16. Risks and Mistakes to Avoid

- Do not make the website look "AI themed" with generic gradients, glowing cards, or buzzwords. Build real teaching workflows.
- Do not expand to too many exams before PSTET and tuition AI are polished.
- Do not use client-supplied payment amounts.
- Do not make referral multi-level.
- Do not open teacher marketplace publicly before KYC, agreement, complaint, refund, payout, and safety flows exist.
- Do not keep adding runtime schema repair helpers forever; migrate to controlled Prisma migrations.
- Do not store sensitive KYC/payout data casually in plain JSON without masking and access policy.
- Do not let AI answer freely when the student is inside a course-bound lesson. It should use syllabus/course/question context.
- Do not let admin UI remain a collection of unrelated pages. It needs a coherent operations console.
- Do not ignore mobile. Students will likely use phone-first flows.

## 17. Final Recommendation

CC Academy has a strong technical base for a professional AI education platform, but it needs disciplined sequencing.

Recommended next move:

1. Approve Phase 1 and Phase 2 as the immediate foundation.
2. Clean the UI and trust layer first.
3. Harden student enrollment and payment before scaling paid courses.
4. Build the PSTET AI Teacher MVP as the flagship product experience.
5. Keep teacher hub feature-gated until onboarding, booking, payment, payout, and safety workflows are production-ready.

The best professional direction is a focused EdTech platform with:

- A polished public brand.
- A reliable student learning dashboard.
- Course-grounded AI teacher.
- Strong mock-test explanations and revision tracking.
- Controlled human teacher marketplace.
- Simple compliant referral wallet.
- Auditable payments, commissions, and payouts.

Once this foundation is stable, CC Academy can expand from PSTET into broader board exams and competitive exams without becoming a fragile collection of pages.
