-- Phase 18: spaced repetition for vocabulary (Leitner boxes).
--
-- box 0 = new (never reviewed). Remembering a word moves it up a box; each
-- box waits longer before the word is due again: 1, 3, 7, 14, 30 days.
-- Forgetting sends it back to box 1 (due tomorrow). Remembering it in the
-- top box marks it learned, so it leaves the review. due_on null = due now.
-- Mirrors reviewIntervalDays() in src/features/languages/logic.ts (tested).

alter table public.language_words
  add column box smallint not null default 0 check (box between 0 and 5),
  add column due_on date,
  add column reviewed_at timestamptz;

comment on column public.language_words.box is
  'Leitner box: 0 new, 1-5 reviewed (higher = known better). Written by review_word().';

-- Days to wait after a review that leaves the word in this box.
create or replace function public.word_review_interval(box smallint)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case box when 1 then 1 when 2 then 3 when 3 then 7 when 4 then 14 else 30 end;
$$;

-- Records one flashcard answer for the caller's word. Returns the new state.
create or replace function public.review_word(word_id uuid, remembered boolean)
returns table (box smallint, due_on date, learned boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  today date := public.current_local_date();
  current_box smallint;
  next_box smallint;
begin
  select w.box into current_box
  from public.language_words w
  where w.id = word_id and w.user_id = (select auth.uid()) and not w.learned
  for update;
  if not found then
    raise exception 'Word not found' using errcode = 'P0002';
  end if;

  if remembered then
    if current_box = 5 then
      -- Remembered at the longest interval: learned.
      return query
        update public.language_words w
           set learned = true, due_on = null, reviewed_at = now()
         where w.id = word_id
        returning w.box, w.due_on, w.learned;
      return;
    end if;
    next_box := current_box + 1;
  else
    next_box := 1;
  end if;

  return query
    update public.language_words w
       set box = next_box,
           due_on = today + public.word_review_interval(next_box),
           reviewed_at = now()
     where w.id = word_id
    returning w.box, w.due_on, w.learned;
end;
$$;

-- review_word() runs as the caller, so it needs these columns. Writing them
-- directly only changes when the caller's own word comes up for review.
grant update (box, due_on, reviewed_at) on table public.language_words to authenticated;

create index language_words_due_idx on public.language_words (user_id, due_on)
  where not learned;

revoke execute on function public.word_review_interval(smallint) from public, anon;
grant execute on function public.word_review_interval(smallint) to authenticated;
revoke execute on function public.review_word(uuid, boolean) from public, anon;
grant execute on function public.review_word(uuid, boolean) to authenticated;
