-- Phase 22: offline writes.
--
-- A task added while offline gets its id on the device, so sending it again
-- after a dropped connection can't create a duplicate (the insert ignores an
-- id that already exists). The id is still a random UUID; RLS keeps every
-- row with its owner as before.

grant insert (id) on table public.tasks to authenticated;
