-- English by Kami — Row Level Security. Default: deny. Writes happen through SECURITY DEFINER functions.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- identity
create policy profiles_read on profiles for select using (id = auth.uid() or is_teacher());
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy roles_read on user_roles for select using (user_id = auth.uid());          -- no write policies: service role only
create policy sp_read on student_profiles for select using (user_id = auth.uid() or is_teacher());
create policy sp_teacher_update on student_profiles for update using (is_teacher());
create policy tp_all on teacher_profiles for all using (is_teacher() and user_id = auth.uid()) with check (is_teacher() and user_id = auth.uid());
create policy settings_own on user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- curriculum (guests = anon role can read published content, never answer keys)
create policy levels_read on levels for select using (true);
create policy levels_t on levels for all using (is_teacher()) with check (is_teacher());
create policy units_read on units for select using (published or is_teacher());
create policy units_t on units for all using (is_teacher()) with check (is_teacher());
create policy lessons_read on lessons for select using (published or is_teacher());
create policy lessons_t on lessons for all using (is_teacher()) with check (is_teacher());
create policy ex_read on exercises for select using (published or is_teacher());
create policy ex_t on exercises for all using (is_teacher()) with check (is_teacher());
create policy keys_t on exercise_keys for all using (is_teacher()) with check (is_teacher());

-- assignments
create policy asg_read on assignments for select using (
  is_teacher() or (published and (
    exists (select 1 from assignment_targets t where t.assignment_id = id and t.student_id = auth.uid())
    or (not exists (select 1 from assignment_targets t where t.assignment_id = id)
        and level = (select level from student_profiles where user_id = auth.uid())))));
create policy asg_t on assignments for all using (is_teacher()) with check (is_teacher() and created_by = auth.uid());
create policy at_read on assignment_targets for select using (student_id = auth.uid() or is_teacher());
create policy at_t on assignment_targets for all using (is_teacher()) with check (is_teacher());
create policy ae_read on assignment_exercises for select using (is_teacher() or exists (select 1 from assignments a where a.id = assignment_id));
create policy ae_t on assignment_exercises for all using (is_teacher()) with check (is_teacher());
create policy sub_read on assignment_submissions for select using (student_id = auth.uid() or is_teacher());
create policy sub_t on assignment_submissions for update using (is_teacher());
create policy att_read on exercise_attempts for select using (user_id = auth.uid() or is_teacher());

-- essays
create policy topics_read on essay_topics for select using (published or is_teacher());
create policy topics_t on essay_topics for all using (is_teacher()) with check (is_teacher());
create policy essays_read on essays for select using (student_id = auth.uid() or is_teacher());
create policy ev_read on essay_versions for select using (is_teacher() or exists (select 1 from essays e where e.id = essay_id and e.student_id = auth.uid()));
create policy ai_read on ai_evaluations for select using (is_teacher() or exists (select 1 from essay_versions v join essays e on e.id = v.essay_id where v.id = essay_version_id and e.student_id = auth.uid()));
create policy grades_read on teacher_grades for select using (student_id = auth.uid() or is_teacher());
create policy grades_ins on teacher_grades for insert with check (is_teacher() and graded_by = auth.uid());

-- teacher admin
create policy att_rec_read on attendance_records for select using (student_id = auth.uid() or is_teacher());
create policy att_rec_t on attendance_records for all using (is_teacher()) with check (is_teacher());
create policy pay_s_read on payment_schedules for select using (student_id = auth.uid() or is_teacher());
create policy pay_s_t on payment_schedules for all using (is_teacher()) with check (is_teacher());
create policy pay_r_read on payment_records for select using (student_id = auth.uid() or is_teacher());
create policy pay_r_ins on payment_records for insert with check (is_teacher());
create policy notes_t on teacher_notes for all using (is_teacher()) with check (is_teacher() and created_by = auth.uid());   -- students: no policy = no access

-- notifications / events / achievements
create policy notif_read on notifications for select using (user_id = auth.uid());
revoke update on notifications from authenticated, anon;   -- use mark_notifications_read()
create policy ev_events_read on assessment_events for select using (user_id = auth.uid() or is_teacher());
create policy ach_read on achievements for select using (true);
create policy ach_t on achievements for all using (is_teacher()) with check (is_teacher());
create policy uach_read on user_achievements for select using (user_id = auth.uid() or is_teacher());
create policy appset_read on app_settings for select using (true);
create policy appset_t on app_settings for all using (is_teacher()) with check (is_teacher());

-- Realtime for in-app notifications
alter publication supabase_realtime add table notifications;
