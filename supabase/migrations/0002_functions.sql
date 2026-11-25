-- English by Kami — server-side logic. All scoring, payment and reset rules live here, never in the browser.

create or replace function is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'teacher')
$$;

-- New auth user → profile + student role + settings. Role is NEVER taken from client metadata.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1));
        lvl level_code := 'A1';
begin
  begin lvl := (new.raw_user_meta_data->>'level')::level_code; exception when others then lvl := 'A1'; end;
  insert into profiles (id, full_name, display_name) values (new.id, nm, split_part(nm,' ',1));
  insert into user_roles (user_id, role) values (new.id, 'student');
  insert into student_profiles (user_id, level) values (new.id, coalesce(lvl,'A1'));
  insert into user_settings (user_id) values (new.id);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function notify_teachers(p_type text, p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link)
  select user_id, p_type, p_title, p_body, p_link from user_roles where role = 'teacher'
$$;
revoke all on function notify_teachers(text,text,text,text) from public, anon, authenticated;

create or replace function notify_user(p_user uuid, p_type text, p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link) values (p_user, p_type, p_title, p_body, p_link)
$$;
revoke all on function notify_user(uuid,text,text,text,text) from public, anon, authenticated;

create or replace function norm_text(t text) returns text language sql immutable as $$
  select lower(btrim(regexp_replace(regexp_replace(replace(replace(coalesce(t,''),'’',''''),'‘',''''), '\s+', ' ', 'g'), '[.!?]+$', '')))
$$;

-- Internal grader. Returns (correct, pending_manual).
create or replace function _grade(p_exercise uuid, p_answer jsonb, out correct boolean, out pending boolean, out ex exercises)
language plpgsql security definer set search_path = public as $$
declare k jsonb;
begin
  select * into ex from exercises where id = p_exercise and published;
  if not found then raise exception 'exercise not found'; end if;
  select answer into k from exercise_keys where exercise_id = p_exercise;
  pending := false;
  if ex.manual_grading or k is null then correct := null; pending := true; return; end if;
  if ex.type in ('mcq','reading') then
    correct := (p_answer->>'choice') is not null and (p_answer->>'choice') = (k->>'correct');
  elsif ex.type in ('order','match') then
    correct := p_answer->'value' is not null and p_answer->'value' = k->'correct';
  else
    correct := exists (select 1 from jsonb_array_elements_text(k->'accepted') a where norm_text(a) = norm_text(p_answer->>'text') and norm_text(p_answer->>'text') <> '');
  end if;
end $$;
revoke all on function _grade(uuid,jsonb) from public, anon, authenticated;

-- Guest-safe: grades without storing anything.
create or replace function check_answer(p_exercise uuid, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from _grade(p_exercise, p_answer);
  return jsonb_build_object('correct', g.correct, 'pending', g.pending,
    'points', case when g.correct then (g.ex).max_points else 0 end, 'explanation', (g.ex).explanation);
end $$;
grant execute on function check_answer(uuid,jsonb) to anon, authenticated;

create or replace function _award_achievements(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare n int; s int;
begin
  select count(distinct exercise_id) into n from exercise_attempts where user_id = p_user and points_awarded > 0 and invalidated_at is null;
  select streak into s from student_profiles where user_id = p_user;
  if n >= 1 then insert into user_achievements values (p_user,'first_steps') on conflict do nothing; end if;
  if n >= 25 then insert into user_achievements values (p_user,'quarter_century') on conflict do nothing; end if;
  if n >= 100 then insert into user_achievements values (p_user,'century') on conflict do nothing; end if;
  if s >= 7 then insert into user_achievements values (p_user,'week_streak') on conflict do nothing; end if;
end $$;
revoke all on function _award_achievements(uuid) from public, anon, authenticated;

create or replace function submit_answer(p_exercise uuid, p_answer jsonb, p_submission uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; sub assignment_submissions; pts int := 0; prior boolean; att int := 1; sp student_profiles;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_submission is not null then
    select * into sub from assignment_submissions where id = p_submission and student_id = uid and status = 'in_progress';
    if not found then raise exception 'submission not open'; end if;
    att := sub.attempt_no;
  end if;
  select * into g from _grade(p_exercise, p_answer);
  select exists (select 1 from exercise_attempts where user_id = uid and exercise_id = p_exercise and points_awarded > 0 and invalidated_at is null) into prior;
  if g.correct and not prior then pts := (g.ex).max_points; end if;
  insert into exercise_attempts (user_id, exercise_id, submission_id, attempt_no, answer, is_correct, points_awarded, needs_review)
    values (uid, p_exercise, p_submission, att, p_answer, g.correct, pts, g.pending);
  select * into sp from student_profiles where user_id = uid;
  update student_profiles set last_active_at = now(), last_active_date = current_date,
    streak = case when sp.last_active_date = current_date then sp.streak
                  when sp.last_active_date = current_date - 1 then sp.streak + 1 else 1 end
    where user_id = uid;
  perform _award_achievements(uid);
  return jsonb_build_object('correct', g.correct, 'pending', g.pending, 'points', pts, 'already_scored', prior and g.correct,
                            'explanation', (g.ex).explanation);
end $$;
grant execute on function submit_answer(uuid,jsonb,uuid) to authenticated;

-- ───────── profile ─────────
create or replace function set_my_profile(p_display text, p_level level_code, p_phone text, p_public boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles set display_name = left(coalesce(nullif(btrim(p_display),''), display_name), 40) where id = auth.uid();
  update student_profiles set level = coalesce(p_level, level), phone = left(p_phone, 40), public_ranking = coalesce(p_public, public_ranking) where user_id = auth.uid();
end $$;
grant execute on function set_my_profile(text,level_code,text,boolean) to authenticated;

create or replace function mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids))
$$;
grant execute on function mark_notifications_read(uuid[]) to authenticated;

-- ───────── scoring & leaderboard ─────────
-- Transparent formula: total = exercise points (first valid correct answer per exercise only)
--                           + 10 × teacher grade (1–5) for the latest graded version of each essay.
-- Repeated attempts, invalidated attempts and guest activity never add points.
create or replace function _scores() returns table (user_id uuid, completed int, ex_points int, essay_points int, total int)
language sql stable security definer set search_path = public as $$
  with ex as (
    select user_id, count(distinct exercise_id) filter (where points_awarded > 0) as completed, coalesce(sum(points_awarded),0)::int as pts
    from exercise_attempts where invalidated_at is null group by user_id),
  es as (
    select t.student_id as user_id, sum(t.grade * 10)::int as pts from (
      select distinct on (e.id) e.student_id, g.grade from essays e
      join essay_versions v on v.essay_id = e.id join teacher_grades g on g.essay_version_id = v.id
      order by e.id, g.graded_at desc) t group by t.student_id)
  select s.user_id, coalesce(ex.completed,0)::int, coalesce(ex.pts,0), coalesce(es.pts,0), coalesce(ex.pts,0) + coalesce(es.pts,0)
  from student_profiles s left join ex on ex.user_id = s.user_id left join es on es.user_id = s.user_id
$$;
revoke all on function _scores() from public, anon, authenticated;

create or replace function get_leaderboard(p_level text default null)
returns table (rank bigint, display_name text, avatar_url text, level level_code, completed int, points int, completion_pct numeric, achievements int, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare t boolean := is_teacher(); pub boolean;
begin
  select coalesce((value->>'public')::boolean, true) into pub from app_settings where key = 'leaderboard';
  if not pub and not t then return; end if;
  return query
  select rank() over (order by sc.total desc, sc.completed desc)::bigint, p.display_name, p.avatar_url, s.level, sc.completed, sc.total,
    case when tot.n = 0 then 0 else round(100.0 * sc.completed / tot.n, 1) end,
    (select count(*)::int from user_achievements ua where ua.user_id = s.user_id),
    s.user_id = auth.uid()
  from student_profiles s join profiles p on p.id = s.user_id join _scores() sc on sc.user_id = s.user_id
  left join lateral (select count(*) n from exercises e join lessons l on l.id = e.lesson_id join units u on u.id = l.unit_id
                     where e.published and u.level = s.level) tot on true
  where s.active and (s.public_ranking or t) and (p_level is null or s.level::text = p_level)
  order by 1, p.display_name;
end $$;
grant execute on function get_leaderboard(text) to authenticated;

create or replace function my_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); r jsonb;
begin
  select jsonb_build_object(
    'completed', sc.completed, 'points', sc.total,
    'attempts', (select count(*) from exercise_attempts where user_id = uid and invalidated_at is null),
    'correct', (select count(*) from exercise_attempts where user_id = uid and invalidated_at is null and is_correct),
    'streak', s.streak,
    'rank', (select x.rnk from (select user_id, rank() over (order by total desc, completed desc) rnk from _scores() sc2
              join student_profiles sp on sp.user_id = sc2.user_id where sp.active and sp.public_ranking) x where x.user_id = uid),
    'level_total', (select count(*) from exercises e join lessons l on l.id = e.lesson_id join units u on u.id = l.unit_id where e.published and u.level = s.level))
  into r from student_profiles s join _scores() sc on sc.user_id = s.user_id where s.user_id = uid;
  return r;
end $$;
grant execute on function my_stats() to authenticated;

-- ───────── assignments, focus mode ─────────
create or replace function start_submission(p_assignment uuid) returns assignment_submissions
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a assignments; sub assignment_submissions; lvl level_code;
begin
  select * into a from assignments where id = p_assignment and published;
  if not found then raise exception 'assignment unavailable'; end if;
  select level into lvl from student_profiles where user_id = uid;
  if exists (select 1 from assignment_targets where assignment_id = a.id) then
    if not exists (select 1 from assignment_targets where assignment_id = a.id and student_id = uid) then raise exception 'not assigned'; end if;
  elsif lvl <> a.level then raise exception 'not assigned'; end if;
  insert into assignment_submissions (assignment_id, student_id) values (a.id, uid) on conflict (assignment_id, student_id) do nothing;
  select * into sub from assignment_submissions where assignment_id = a.id and student_id = uid;
  if sub.status = 'returned' then
    update assignment_submissions set status = 'in_progress', attempt_no = attempt_no + 1 where id = sub.id returning * into sub;
  end if;
  if sub.status = 'in_progress' and not exists (select 1 from assessment_events where submission_id = sub.id and attempt_no = sub.attempt_no and event_type = 'start') then
    insert into assessment_events (user_id, submission_id, attempt_no, event_type) values (uid, sub.id, sub.attempt_no, 'start');
  end if;
  return sub;
end $$;
grant execute on function start_submission(uuid) to authenticated;

create or replace function finish_submission(p_submission uuid) returns void
language plpgsql security definer set search_path = public as $$
declare sub assignment_submissions; a assignments; nm text;
begin
  update assignment_submissions set status = 'submitted', submitted_at = now()
    where id = p_submission and student_id = auth.uid() and status = 'in_progress' returning * into sub;
  if not found then raise exception 'submission not open'; end if;
  select * into a from assignments where id = sub.assignment_id;
  select display_name into nm from profiles where id = auth.uid();
  insert into assessment_events (user_id, submission_id, attempt_no, event_type) values (auth.uid(), sub.id, sub.attempt_no, 'submit');
  perform notify_teachers('assignment_submitted', nm || ' submitted "' || a.title || '"', null, '/teacher/assignments');
end $$;
grant execute on function finish_submission(uuid) to authenticated;

-- Records ONE qualifying exit. Client already merges visibilitychange+blur; server also de-duplicates exits <1.5s apart.
create or replace function log_exit(p_submission uuid, p_detail text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sub assignment_submissions; a assignments; n int; last_exit timestamptz; did_reset boolean := false; nm text;
begin
  select * into sub from assignment_submissions where id = p_submission and student_id = uid and status = 'in_progress';
  if not found then return jsonb_build_object('ignored', true); end if;
  select * into a from assignments where id = sub.assignment_id;
  if not a.focus_mode then return jsonb_build_object('ignored', true); end if;
  select max(created_at) into last_exit from assessment_events where submission_id = sub.id and attempt_no = sub.attempt_no and event_type = 'exit';
  if last_exit is not null and now() - last_exit < interval '1.5 seconds' then
    return jsonb_build_object('ignored', true, 'duplicate', true);
  end if;
  select count(*) + 1 into n from assessment_events where submission_id = sub.id and attempt_no = sub.attempt_no and event_type = 'exit';
  insert into assessment_events (user_id, submission_id, attempt_no, event_type, warning_no, detail) values (uid, sub.id, sub.attempt_no, 'exit', least(n,3), p_detail);
  insert into assessment_events (user_id, submission_id, attempt_no, event_type, warning_no) values (uid, sub.id, sub.attempt_no, 'warning', least(n,3));
  select display_name into nm from profiles where id = uid;
  if n >= 3 then
    if a.reset_on_third_exit then
      update exercise_attempts set answer = null, is_correct = null, points_awarded = 0, needs_review = false,
        invalidated_at = now(), invalid_reason = 'Assessment reset after 3 exits'
        where submission_id = sub.id and attempt_no = sub.attempt_no and invalidated_at is null;
      update assignment_submissions set attempt_no = attempt_no + 1, started_at = now() where id = sub.id;
      insert into assessment_events (user_id, submission_id, attempt_no, event_type, detail)
        values (uid, sub.id, sub.attempt_no, 'reset', 'Third qualifying exit — attempt invalidated per teacher settings');
      did_reset := true;
    end if;
    perform notify_teachers('repeated_exits', nm || ' left "' || a.title || '" 3 times', 'Focus-loss events are a deterrent signal, not proof of cheating.', '/teacher/results');
  end if;
  return jsonb_build_object('warning', least(n,3), 'reset', did_reset);
end $$;
grant execute on function log_exit(uuid,text) to authenticated;

-- ───────── essays ─────────
create or replace function save_draft(p_topic uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if length(p_body) > 20000 then raise exception 'essay too long'; end if;
  insert into essays (student_id, topic_id, draft_body, status) values (auth.uid(), p_topic, p_body, 'draft')
  on conflict (student_id, topic_id) do update set draft_body = excluded.draft_body, updated_at = now(),
    status = case when essays.status = 'reviewed' then 'draft' else essays.status end
    where essays.status <> 'submitted'
  returning id into eid;
  if eid is null then select id into eid from essays where student_id = auth.uid() and topic_id = p_topic; end if;
  return eid;
end $$;
grant execute on function save_draft(uuid,text) to authenticated;

create or replace function submit_essay(p_essay uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare e essays; v int; wc int; vid uuid; nm text; tt text;
begin
  select * into e from essays where id = p_essay and student_id = auth.uid() and status = 'draft';
  if not found then raise exception 'essay not found or already submitted'; end if;
  wc := coalesce(array_length(regexp_split_to_array(btrim(e.draft_body), '\s+'), 1), 0);
  if btrim(e.draft_body) = '' then raise exception 'essay is empty'; end if;
  select coalesce(max(version),0) + 1 into v from essay_versions where essay_id = e.id;
  insert into essay_versions (essay_id, version, body, word_count) values (e.id, v, e.draft_body, wc) returning id into vid;
  update essays set status = 'submitted', updated_at = now() where id = e.id;
  insert into ai_evaluations (essay_version_id) values (vid);
  select display_name into nm from profiles where id = auth.uid();
  select title into tt from essay_topics where id = e.topic_id;
  perform notify_teachers('essay_submitted', nm || ' submitted an essay', tt, '/teacher/essays');
  return vid;
end $$;
grant execute on function submit_essay(uuid) to authenticated;

-- Teacher grade → mark reviewed + notify the student.
create or replace function on_teacher_grade() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.essay_version_id is not null then
    update essays set status = 'reviewed', updated_at = now() where id = (select essay_id from essay_versions where id = new.essay_version_id);
    perform notify_user(new.student_id, 'essay_reviewed', 'Your essay has been reviewed', 'Grade: ' || new.grade || '/5', '/app/essays');
  else
    update assignment_submissions set status = 'reviewed' where id = new.submission_id;
    perform notify_user(new.student_id, 'graded', 'New teacher feedback', 'Grade: ' || new.grade || '/5', '/app');
  end if;
  return new;
end $$;
drop trigger if exists teacher_grade_after on teacher_grades;
create trigger teacher_grade_after after insert on teacher_grades for each row execute function on_teacher_grade();

-- ───────── payments ─────────
-- Anchored month math: period_end = start_date + n months (computed from the anchor, so Jan 31 → Feb 28 → Mar 31, no drift).
create or replace function record_payment(p_student uuid, p_amount numeric, p_paid_on date, p_method text default null, p_reference text default null, p_note text default null)
returns payment_records language plpgsql security definer set search_path = public as $$
declare anchor date; n int; prev date; rec payment_records;
begin
  if not is_teacher() then raise exception 'forbidden'; end if;
  select start_date into anchor from payment_schedules where student_id = p_student;
  if anchor is null then
    anchor := p_paid_on;
    insert into payment_schedules (student_id, monthly_amount, start_date) values (p_student, p_amount, anchor);
  end if;
  select count(*) + 1, max(period_end) into n, prev from payment_records where student_id = p_student;
  insert into payment_records (student_id, amount, paid_on, period_start, period_end, method, reference, note, recorded_by)
  values (p_student, p_amount, p_paid_on, coalesce(prev, anchor), (anchor + (n || ' months')::interval)::date, p_method, p_reference, p_note, auth.uid())
  returning * into rec;
  perform notify_user(p_student, 'payment', 'Payment recorded', 'Paid through ' || to_char(rec.period_end, 'DD Mon YYYY'), '/app/settings');
  return rec;
end $$;
grant execute on function record_payment(uuid,numeric,date,text,text,text) to authenticated;

create or replace function payment_overview()
returns table (student_id uuid, full_name text, student_code text, level level_code, monthly_amount numeric, last_paid_on date, paid_through date, days_remaining int, status text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_teacher() then raise exception 'forbidden'; end if;
  return query
  select s.user_id, p.full_name, s.student_code, s.level, coalesce(ps.monthly_amount,0), lp.paid_on, lp.period_end,
    case when lp.period_end is null then null else (lp.period_end - current_date) end,
    case when lp.period_end is null then 'unpaid'
         when lp.period_end < current_date then 'overdue'
         when lp.period_end = current_date then 'due_today'
         when lp.period_end - current_date <= 7 then 'due_soon' else 'paid' end
  from student_profiles s join profiles p on p.id = s.user_id
  left join payment_schedules ps on ps.student_id = s.user_id
  left join lateral (select paid_on, period_end from payment_records r where r.student_id = s.user_id order by period_end desc limit 1) lp on true
  where s.active;
end $$;
grant execute on function payment_overview() to authenticated;

create or replace function notify_assignment(p_user uuid, p_title text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_teacher() then raise exception 'forbidden'; end if;
  perform notify_user(p_user, 'assignment', 'New assignment: ' || p_title, null, '/app/assignments');
end $$;
grant execute on function notify_assignment(uuid,text) to authenticated;
