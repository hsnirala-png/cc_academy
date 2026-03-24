# Prisma Recovery Plan

This recovery bundle is prepared on the dedicated branch `chore/prisma-rebaseline-recovery` in the worktree:

`e:\CCAcademy\cc_academy_prisma_recovery`

It is intentionally isolated from `main`.

## Audit Summary

Local migration folders currently present:

- `20260216120000_add_mock_test_module`
- `20260217125000_add_products_module`
- `20260217190000_add_digital_lessons_module`
- `20260226173000_add_question_section_label`
- `20260226231000_add_mock_test_sections`
- `20260227093000_add_chapter_sub_subject`
- `20260227190000_add_mock_test_registration_gate`
- `20260228001000_add_mock_registration_preferences`
- `20260302123000_add_contact_queries_module`
- `20260302143000_link_contact_queries_to_students`
- `20260302211000_add_bilingual_language_mode`
- `20260302224500_add_bilingual_question_content`
- `20260302233500_add_maths_and_evs_subjects`
- `20260304090000_add_question_display_order`

Applied migration names found in the real database but missing from the current branch:

- `20260310223000_add_lesson_ai_teacher_phase1`

Problems confirmed from repo evidence:

1. The earliest tracked migration, `20260216120000_add_mock_test_module`, already references `User`, but no earlier tracked migration creates `User`.
2. The current tracked migration chain does not create all current-schema tables. At minimum, the original history for `User`, `CoachingClass`, `SubscriptionPlan`, and `StudentSubscription` is missing from the local migration tree.
3. `SHADOW_DATABASE_URL` is configured to a persistent shared database in the current env files. That is unsafe for `prisma migrate dev` replay.
4. The real DB history and current branch history diverge because the DB records an applied lesson-AI migration folder that is not present on `main`.

## Canonical Schema Target

The canonical schema target for recovery is:

- current `main` codebase intent
- plus the approved Phase 2 tuition schema

This schema snapshot is stored here:

- [canonical-main-plus-phase2.schema.prisma](/e:/CCAcademy/cc_academy_prisma_recovery/backend/prisma/recovery/canonical-main-plus-phase2.schema.prisma)

This canonical schema does **not** include `AiConversation` / `AiMessage`, because the current approved repo schema for `main + Phase 2` does not include those models.

The historical missing AI migration is preserved for audit only here:

- [20260310223000_add_lesson_ai_teacher_phase1/migration.sql](/e:/CCAcademy/cc_academy_prisma_recovery/backend/prisma/recovery/historical-migrations/20260310223000_add_lesson_ai_teacher_phase1/migration.sql)

## Recommended Recovery Model

Use a **single audited baseline migration** for fresh-environment setup.

Reason:

- the old replay chain is incomplete before the first tracked migration
- later history also diverges from the DB record
- a fresh baseline generated from the canonical schema is safer and more auditable than trying to guess missing intermediate migrations

Implication:

- old broken replay should be retired from **fresh-environment setup**
- old migration folders should be kept only as historical archive during recovery review
- production history should **not** be rewritten blindly

## Recovery Artifacts Prepared

Candidate single-baseline migration generated from the canonical schema:

- [00000000000000_baseline_main_plus_phase2/migration.sql](/e:/CCAcademy/cc_academy_prisma_recovery/backend/prisma/recovery/candidate-migrations/00000000000000_baseline_main_plus_phase2/migration.sql)
- [migration_lock.toml](/e:/CCAcademy/cc_academy_prisma_recovery/backend/prisma/recovery/candidate-migrations/migration_lock.toml)

This candidate baseline is for human review. It is **not** active in the current `prisma/migrations` directory yet.

## Unresolved Historical Points

These current-schema tables are handled correctly by the candidate baseline, but their exact original introduction point is not reconstructable from the tracked migration folders alone:

- `ProductPurchase`
- `ReferralPayoutMethod`
- `ReferralWithdrawal`
- `ReferralTransaction`

That uncertainty is exactly why the recovery model uses a single audited canonical baseline instead of trying to recreate every missing historical step.

## Safe Environment Settings

Use separate databases for replay validation:

- `DATABASE_URL`: a fresh empty scratch database only for validation
- `SHADOW_DATABASE_URL`: a separate disposable empty shadow database

Do **not** point either setting at the existing shared production-like database during recovery replay testing.

Suggested naming:

- `cc_academy_rebaseline_check`
- `cc_academy_rebaseline_shadow`

## Local Review Commands

Create isolated validation databases:

```bash
mysql -h 72.60.223.230 -u cc_user -p -e "CREATE DATABASE cc_academy_rebaseline_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -h 72.60.223.230 -u cc_user -p -e "CREATE DATABASE cc_academy_rebaseline_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Set shell-local env only:

```powershell
$env:DATABASE_URL="mysql://cc_user:<encoded-password>@72.60.223.230:3306/cc_academy_rebaseline_check"
$env:SHADOW_DATABASE_URL="mysql://cc_user:<encoded-password>@72.60.223.230:3306/cc_academy_rebaseline_shadow"
```

Review the candidate artifacts:

```powershell
cd e:\CCAcademy\cc_academy_prisma_recovery\backend
npx prisma generate
```

## Activation Plan For The Recovery Branch

Do this only after human review on the recovery branch.

Archive the current broken replay chain:

```powershell
cd e:\CCAcademy\cc_academy_prisma_recovery\backend\prisma
Rename-Item migrations migrations_legacy_pre_rebaseline
New-Item -ItemType Directory migrations\00000000000000_baseline_main_plus_phase2 | Out-Null
Copy-Item recovery\candidate-migrations\00000000000000_baseline_main_plus_phase2\migration.sql migrations\00000000000000_baseline_main_plus_phase2\migration.sql
Copy-Item recovery\candidate-migrations\migration_lock.toml migrations\migration_lock.toml
```

Then validate against the fresh scratch DB:

```powershell
cd e:\CCAcademy\cc_academy_prisma_recovery\backend
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run build
```

Minimal smoke checks after deploy:

```powershell
@'
process.env.JWT_SECRET = process.env.JWT_SECRET || "rebaseline-check-secret";
require("dotenv").config();
const appModule = require("./dist/app.js");
const app = appModule.default || appModule;
const server = app.listen(5053, async () => {
  const health = await fetch("http://127.0.0.1:5053/health");
  console.log("health", health.status);
  server.close();
});
'@ | node -
```

## Existing Databases

Do **not** switch existing populated databases to the rebaselined migration directory automatically.

For existing DBs, use this order:

1. Backup the database.
2. Validate the rebaselined branch on a fresh empty DB.
3. Decide whether existing environments will:
   - remain on the legacy migration history for now, or
   - move by controlled cutover into a fresh DB initialized from the new baseline.

Backup command:

```bash
mysqldump -h 72.60.223.230 -u cc_user -p cc_academy > cc_academy_backup_before_rebaseline.sql
```

## Outcome

If the activation plan above passes on a fresh empty DB, then:

- fresh-environment setup becomes reproducible
- Phase 2 schema becomes reproducible as part of the canonical baseline
- existing production-like DB adoption still requires separate human review
