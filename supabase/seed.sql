-- English by Kami — sample content. Run after migrations. Safe to re-run (guards on conflict).
insert into levels values ('A1','A1 — Beginner',1),('A2','A2 — Elementary',2),('B1','B1 — Intermediate',3),('B2','B2 — Upper-Intermediate',4),('IELTS','IELTS Preparation',5) on conflict do nothing;
insert into achievements values
 ('first_steps','First Steps','Completed your first exercise'),
 ('quarter_century','Quarter Century','25 exercises completed'),
 ('century','Century','100 exercises completed'),
 ('week_streak','7-Day Streak','Learned 7 days in a row') on conflict do nothing;

-- A1 curriculum skeleton: 10 units (lessons/exercises are added by the teacher in Content Management or by batch SQL)
insert into units (level, position, title, description, published)
select 'A1', n, t, d, n = 1 from (values
 (1,'Introduction','Greetings, introductions and the verb "to be"'),
 (2,'Personal Information','Personal information and pronouns'),
 (3,'Numbers and Time','Numbers, dates, time and everyday objects'),
 (4,'Family','Family and possessive adjectives'),
 (5,'Daily Routines','Present Simple and daily routines'),
 (6,'Questions','Questions, negatives and short answers'),
 (7,'Food and Drink','Food, drinks and countable nouns'),
 (8,'Places','There is / There are and prepositions of place'),
 (9,'Abilities','Can / Can''t, abilities and basic requests'),
 (10,'Revision','Revision, practical conversations and final assessment')) v(n,t,d) on conflict do nothing;

-- Unit 1 → Lesson 1 with real sample exercises
with u as (select id from units where level='A1' and position=1),
l as (insert into lessons (unit_id, position, title, published) select id, 1, 'Verb To Be', true from u on conflict (unit_id, position) do update set title = excluded.title returning id)
insert into exercises (lesson_id, position, type, prompt, data, max_points, explanation, published)
select l.id, x.pos, x.type::exercise_type, x.prompt, x.data::jsonb, 10, x.expl, true from l, (values
 (1,'mcq','I ___ a student.','{"options":["am","is","are"]}','Use "am" with "I".'),
 (2,'mcq','She ___ from Spain.','{"options":["am","is","are"]}','Use "is" with he/she/it.'),
 (3,'mcq','They ___ my friends.','{"options":["is","am","are"]}','Use "are" with we/you/they.'),
 (4,'fill','We ___ happy. (am / is / are)','{}','Use "are" with "we".'),
 (5,'fill','He ___ a teacher. (am / is / are)','{}','Use "is" with "he".'),
 (6,'order','Put the words in order.','{"words":["is","name","My","Anna"]}','Word order: subject + verb + complement.'),
 (7,'match','Match the pronoun with the verb.','{"left":["I","She","You"],"right":["am","is","are"]}','I am · she is · you are.'),
 (8,'translation','Write in English: "Меня зовут Ali."','{}','"My name is Ali." or "I am Ali."'),
 (9,'mcq','___ you from Uzbekistan?','{"options":["Is","Am","Are"]}','Questions with "you" use "Are".'),
 (10,'short','Write one sentence about yourself using "I am".','{}','Teacher reviews this answer.')
) as x(pos,type,prompt,data,expl);
update exercises set manual_grading = true where type = 'short' and prompt like 'Write one sentence about yourself%';

insert into exercise_keys (exercise_id, answer)
select e.id, k.a::jsonb from exercises e join (values
 ('I ___ a student.','{"correct":"0"}'),
 ('She ___ from Spain.','{"correct":"1"}'),
 ('They ___ my friends.','{"correct":"2"}'),
 ('We ___ happy. (am / is / are)','{"accepted":["are"]}'),
 ('He ___ a teacher. (am / is / are)','{"accepted":["is"]}'),
 ('Put the words in order.','{"correct":["My","name","is","Anna"]}'),
 ('Match the pronoun with the verb.','{"correct":{"I":"am","She":"is","You":"are"}}'),
 ('Write in English: "Меня зовут Ali."','{"accepted":["My name is Ali","I am Ali","I''m Ali"]}'),
 ('___ you from Uzbekistan?','{"correct":"2"}')
) as k(p,a) on k.p = e.prompt on conflict do nothing;

-- Essay topics (sample; add the rest via Content Management or batch inserts — target 25 per level)
insert into essay_topics (level, kind, title, instructions, min_words, max_words, vocabulary, rubric) values
 ('A1','general','My Family','Write 5–7 simple sentences about your family. Say who is in your family and what they do.',40,80,'{mother,father,sister,brother,works}','[{"criterion":"Grammar","max":5},{"criterion":"Vocabulary","max":5},{"criterion":"Task","max":5}]'),
 ('A1','general','My Daily Routine','Write about your day. Use time words: in the morning, at 8 o''clock, in the evening.',40,80,'{wake up,breakfast,school,homework,sleep}','[{"criterion":"Grammar","max":5},{"criterion":"Vocabulary","max":5},{"criterion":"Task","max":5}]'),
 ('A1','general','My Favourite Food','Write about food you like and do not like. Say why.',40,80,'{delicious,breakfast,fruit,like,favourite}','[{"criterion":"Grammar","max":5},{"criterion":"Vocabulary","max":5},{"criterion":"Task","max":5}]'),
 ('A1','general','My Best Friend','Describe your best friend: name, age, appearance and what you do together.',40,80,'{friend,tall,funny,together,play}','[{"criterion":"Grammar","max":5},{"criterion":"Vocabulary","max":5},{"criterion":"Task","max":5}]'),
 ('A2','general','A Trip I Remember','Write about a trip. Where did you go, who was with you and what happened? Use the past simple.',80,140,'{journey,visited,beautiful,arrived,souvenir}','[{"criterion":"Task","max":5},{"criterion":"Grammar","max":5},{"criterion":"Vocabulary","max":5},{"criterion":"Organisation","max":5}]'),
 ('B1','general','Should Students Wear School Uniforms?','Give your opinion. Write 3–4 paragraphs with reasons and examples.',150,220,'{in my opinion,however,on the other hand,rule,comfortable}','[{"criterion":"Task","max":5},{"criterion":"Coherence","max":5},{"criterion":"Grammar","max":5},{"criterion":"Vocabulary","max":5}]'),
 ('B2','general','Social Media: Advantages and Disadvantages','Discuss the advantages and disadvantages of social media for young people and give your own view.',200,300,'{addiction,connectivity,misinformation,privacy,outweigh}','[{"criterion":"Task","max":5},{"criterion":"Coherence","max":5},{"criterion":"Lexical range","max":5},{"criterion":"Grammar","max":5}]'),
 ('IELTS','ielts_task2','Technology and Work','Some people believe automation will create more problems than benefits in the workplace. To what extent do you agree or disagree? Give reasons and relevant examples. Write at least 250 words.',250,null,'{automation,unemployment,productivity,workforce,displace}','[{"criterion":"Task Response","max":9},{"criterion":"Coherence and Cohesion","max":9},{"criterion":"Lexical Resource","max":9},{"criterion":"Grammatical Range and Accuracy","max":9}]'),
 ('IELTS','ielts_task2','University Education for All?','Some people think universities should accept anyone who wants to study, while others think entry should be selective. Discuss both views and give your opinion. Write at least 250 words.',250,null,'{tuition,merit,accessibility,selective,vocational}','[{"criterion":"Task Response","max":9},{"criterion":"Coherence and Cohesion","max":9},{"criterion":"Lexical Resource","max":9},{"criterion":"Grammatical Range and Accuracy","max":9}]'),
 ('IELTS','ielts_task1','Academic Task 1 — Line Graph','The graph shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features and make comparisons where relevant. Write at least 150 words.',150,null,'{increase,fluctuate,peak,steadily,proportion}','[{"criterion":"Task Achievement","max":9},{"criterion":"Coherence and Cohesion","max":9},{"criterion":"Lexical Resource","max":9},{"criterion":"Grammatical Range and Accuracy","max":9}]')
on conflict do nothing;
-- Promote the teacher (run once, using the teacher's real auth user id after they sign up):
--   insert into user_roles (user_id, role) values ('<TEACHER-UUID>', 'teacher');
--   insert into teacher_profiles (user_id) values ('<TEACHER-UUID>');
