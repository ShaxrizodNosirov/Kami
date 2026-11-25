-- English by Kami — schema. Run in order: 0001, 0002, 0003, then seed.sql
create extension if not exists pgcrypto;

create type app_role as enum ('student','teacher');
create type level_code as enum ('A1','A2','B1','B2','IELTS');
create type exercise_type as enum ('mcq','fill','order','match','translation','reading','short');
create type attendance_status as enum ('present','absent','late','excused');
create type submission_status as enum ('not_started','in_progress','submitted','reviewed','returned');
create type essay_status as enum ('draft','submitted','reviewed');
create type essay_kind as enum ('general','ielts_task1','ielts_task2');

-- ───────── identity ─────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);
-- Roles are written ONLY by the service role / SQL editor. No client policy allows writes.
create table user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  primary key (user_id, role)
);
create table student_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  student_code text unique not null default ('KM-' || upper(substr(md5(random()::text),1,6))),
  level level_code not null default 'A1',
  phone text,
  enrolled_on date not null default current_date,
  active boolean not null default true,
  public_ranking boolean not null default true,
  streak int not null default 0,
  last_active_date date,
  last_active_at timestamptz
);
create table teacher_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  bio text
);
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_notifications boolean not null default true,
  in_app_notifications boolean not null default true
);

-- ───────── curriculum ─────────
create table levels (code level_code primary key, title text not null, sort int not null);
create table units (
  id uuid primary key default gen_random_uuid(),
  level level_code not null references levels(code),
  position int not null,
  title text not null,
  description text,
  published boolean not null default false,
  unique (level, position)
);
create table lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  position int not null,
  title text not null,
  published boolean not null default false,
  unique (unit_id, position)
);
-- Public part of an exercise (no answers). options/pairs/words live in `data`.
create table exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  position int not null,
  type exercise_type not null,
  prompt text not null,
  data jsonb not null default '{}',
  max_points int not null default 10 check (max_points between 0 and 100),
  explanation text,
  manual_grading boolean not null default false,
  published boolean not null default false,
  unique (lesson_id, position)
);
-- Answer keys: teacher-only table. Students/guests can never SELECT it.
create table exercise_keys (
  exercise_id uuid primary key references exercises(id) on delete cascade,
  answer jsonb not null
);
create index on exercises (lesson_id);

-- ───────── assignments ─────────
create table assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructions text,
  level level_code not null,
  unit_id uuid references units(id),
  lesson_id uuid references lessons(id),
  max_points int not null default 100,
  deadline timestamptz,
  published boolean not null default false,
  focus_mode boolean not null default false,
  reset_on_third_exit boolean not null default true,
  allow_review boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
-- If an assignment has rows here it targets only these students; otherwise the whole level.
create table assignment_targets (
  assignment_id uuid references assignments(id) on delete cascade,
  student_id uuid references student_profiles(user_id) on delete cascade,
  primary key (assignment_id, student_id)
);
create table assignment_exercises (
  assignment_id uuid references assignments(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  primary key (assignment_id, exercise_id)
);
create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references student_profiles(user_id) on delete cascade,
  status submission_status not null default 'in_progress',
  attempt_no int not null default 1,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (assignment_id, student_id)
);

create table exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  submission_id uuid references assignment_submissions(id) on delete set null,
  attempt_no int not null default 1,           -- assessment attempt number
  answer jsonb,                                  -- nulled if attempt invalidated
  is_correct boolean,
  points_awarded int not null default 0,         -- >0 only for the first valid correct attempt
  needs_review boolean not null default false,
  invalidated_at timestamptz,
  invalid_reason text,
  created_at timestamptz not null default now()
);
create index on exercise_attempts (user_id, exercise_id);
create index on exercise_attempts (submission_id);

-- ───────── essays ─────────
create table essay_topics (
  id uuid primary key default gen_random_uuid(),
  level level_code not null,
  kind essay_kind not null default 'general',
  title text not null,
  instructions text not null,
  min_words int not null default 50,
  max_words int,
  vocabulary text[] not null default '{}',
  rubric jsonb not null default '[]',
  published boolean not null default true
);
create table essays (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profiles(user_id) on delete cascade,
  topic_id uuid not null references essay_topics(id),
  status essay_status not null default 'draft',
  draft_body text not null default '',
  updated_at timestamptz not null default now(),
  unique (student_id, topic_id)
);
create table essay_versions (
  id uuid primary key default gen_random_uuid(),
  essay_id uuid not null references essays(id) on delete cascade,
  version int not null,
  body text not null,
  word_count int not null,
  submitted_at timestamptz not null default now(),
  unique (essay_id, version)
);
create table ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  essay_version_id uuid not null references essay_versions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','done','failed')),
  criteria jsonb,            -- {grammar:{score,comment}, ...}
  ielts_bands jsonb,         -- {task_response, coherence, lexical, grammar, overall} (estimates)
  feedback text,
  corrections jsonb,
  model text,
  error text,
  email_status text,         -- 'sent' | 'skipped' | 'failed: ...'
  created_at timestamptz not null default now()
);
-- Teacher's own 1–5 grade. Never mixed with exercise points or AI/IELTS bands.
create table teacher_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profiles(user_id) on delete cascade,
  essay_version_id uuid references essay_versions(id) on delete cascade,
  submission_id uuid references assignment_submissions(id) on delete cascade,
  grade int not null check (grade between 1 and 5),
  comments text,
  recommendations text,
  question_scores jsonb,
  graded_by uuid not null references profiles(id),
  graded_at timestamptz not null default now(),
  check (essay_version_id is not null or submission_id is not null)
);

-- ───────── teaching admin ─────────
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profiles(user_id) on delete cascade,
  lesson_date date not null,
  session_label text not null default 'Lesson',
  status attendance_status not null,
  note text,
  recorded_by uuid references profiles(id),
  corrected_at timestamptz,
  unique (student_id, lesson_date, session_label)
);
create table payment_schedules (
  student_id uuid primary key references student_profiles(user_id) on delete cascade,
  monthly_amount numeric(12,2) not null default 0,
  start_date date not null default current_date   -- billing anchor (day-of-month preserved at month end)
);
create table payment_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profiles(user_id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  paid_on date not null,
  period_start date not null,
  period_end date not null,    -- paid through (exclusive expiry date)
  method text,
  reference text,
  note text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index on payment_records (student_id, period_end desc);
create table teacher_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profiles(user_id) on delete cascade,
  category text,
  body text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read_at, created_at desc);
create table assessment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  submission_id uuid references assignment_submissions(id) on delete cascade,
  attempt_no int not null default 1,
  event_type text not null check (event_type in ('start','exit','warning','reset','submit')),
  warning_no int,
  detail text,
  created_at timestamptz not null default now()
);
create table achievements (code text primary key, title text not null, description text not null);
create table user_achievements (
  user_id uuid references profiles(id) on delete cascade,
  code text references achievements(code),
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);
create table app_settings (key text primary key, value jsonb not null);
insert into app_settings values ('leaderboard', '{"public": true}');
