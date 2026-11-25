# English by Kami

English learning platform: **Student Portal** (guest + registered) and **Teacher Dashboard**, on React + Vite + Supabase.

> **Status (honest):** all code in this repo was written without network access, so `npm install`, `npm run build`,
> the Vitest suite and the SQL migrations have **not** been executed against a real project yet. Only the pure logic in
> `src/lib` (payments, scoring, focus-mode exit counting) was checked with Node. Follow *First run* below and fix any
> compile errors it reports before deploying. See *Known gaps* for what is still missing.

## First run
```bash
npm install
cp .env.example .env            # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run typecheck && npm test && npm run dev
```

## Supabase setup
1. Create a Supabase project.
2. SQL editor → run in order: `supabase/migrations/0001_schema.sql`, `0002_functions.sql`, `0003_rls.sql`, then `supabase/seed.sql`.
3. Auth → URL configuration: add your site URL; keep "Confirm email" on.
4. **Create the teacher:** register normally at `/register`, then in the SQL editor:
   ```sql
   insert into user_roles (user_id, role) values ('<USER-UUID>', 'teacher');
   insert into teacher_profiles (user_id) values ('<USER-UUID>');
   ```
   Roles can only be written with the service role / SQL editor; no client policy permits it, so students cannot promote themselves. Then sign in at `/teacher/login`.
5. AI essay feedback + email (Edge Function):
   ```bash
   supabase functions deploy evaluate-essay
   supabase secrets set ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=claude-sonnet-4-6
   supabase secrets set RESEND_API_KEY=... MAIL_FROM="English by Kami <no-reply@your-domain>" SITE_URL=https://your-domain   # optional email
   ```
   If the AI call or email fails, the essay is still saved and queued for the teacher; the failure is recorded on `ai_evaluations` and shown honestly in the UI.

## Architecture / security
- Browser only holds the anon key. **Every privileged rule is server-side**: answer grading (`submit_answer`, `check_answer`), score awards (first correct answer per exercise only), payments (`record_payment`), focus-mode resets (`log_exit`), essay versioning (`submit_essay`).
- Answer keys live in `exercise_keys` (teacher-only RLS) so students and guests never receive correct answers.
- Teacher-only tables (`teacher_notes`, keys, payments write) have no student policies. Leaderboard exposes only display name, level, counts and points via `get_leaderboard`.
- Guest progress is `localStorage` only; guests call `check_answer` (stores nothing) and never appear in the teacher dashboard/ranking.
- Score formula: exercise points (first valid correct answer per exercise) + 10 × teacher grade (1–5) per essay. AI estimates and IELTS bands are stored and displayed separately.
- Payments: `period_end = anchor_start + n months` (clamped at month end, no drift). Status: unpaid / overdue / due today / due soon (≤7 days) / paid.
- Focus mode is a **deterrent, not proof**. It merges `visibilitychange` + `blur` into one exit, the server de-duplicates exits <1.5 s apart, and on the 3rd exit (if enabled) invalidates only that attempt's answers while keeping the audit trail. It cannot detect other devices, screenshots or AI tools.

## Tests
`npm test` runs `src/test/lib.test.ts` (payments incl. month-end, scoring/no duplicate awards, text matching, focus-mode counting, word count).
DB-level behaviour (RLS, grading, resets) should be verified in a Supabase **staging** project: sign in as a student and confirm `select * from exercise_keys` returns 0 rows, `insert into user_roles` is denied, and another student's `essays` are invisible.

## Deploy
Vercel: import repo, framework Vite, set the two `VITE_` env vars (`vercel.json` handles SPA routing). Replace `YOUR-DOMAIN` in `public/robots.txt` and `public/sitemap.xml`.
Backups: enable Supabase daily backups (Pro) or schedule `pg_dump`.

## Known gaps (not done yet)
- Curriculum content: A1 skeleton + 10 sample exercises and 10 sample topics only. Add the rest in **Content Management** or batch SQL (target: 25 topics per level, 25+ IELTS Task 2).
- Guest → account progress transfer: guest points are not imported (server cannot trust client scores); the register page says so.
- Per-question teacher scores, notification preference UI beyond email toggle, IELTS Task 1 chart images, listening audio, and avatar upload are not implemented.
- Teachers add students by having them register; there is no teacher-created account flow (needs a service-role Edge Function).
- No automated DB/RLS tests or end-to-end tests yet.
