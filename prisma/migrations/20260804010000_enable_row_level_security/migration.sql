-- Row level security on every table in the watchtower schema.
--
-- WHAT THIS DOES, AND WHAT IT HONESTLY DOES NOT.
--
-- Enabling RLS with no permissive policy means: every role EXCEPT the table owner
-- and roles holding BYPASSRLS gets zero rows, on every table, for every
-- operation. There is no policy to grant anything back, deliberately.
--
-- The application connects as `postgres`, which both owns these tables and holds
-- rolbypassrls, so the app is unaffected and keeps working exactly as it does
-- today. That is the point: the app already scopes every query by profileId, and
-- that was audited end to end and found correct. This is not replacing that
-- control, it is putting a floor under everything else.
--
-- WHAT IT ACTUALLY CLOSES:
--   * a leaked or misissued non-superuser credential reads nothing
--   * the Supabase `anon` and `authenticated` roles read nothing, so if the
--     watchtower schema is ever added to the exposed-schemas list by accident,
--     which is one checkbox in a dashboard, the tables stay shut
--   * any future direct-from-browser client cannot read the tables by default
--   * a read-only reporting or BI role added later starts closed, not open
--
-- WHAT IT DOES NOT CLOSE. If DATABASE_URL itself leaks, the attacker is the
-- bypassrls owner and RLS is irrelevant. Nothing at the database layer can fix
-- that while a single trusted connection serves all members; the answer there is
-- credential rotation and least-privilege roles, which is separate work.
--
-- WHY NOT PER-MEMBER POLICIES. The honest reason: Prisma serves every member over
-- one pooled connection and sets no per-request database identity. Real per-row
-- policies would need `SET LOCAL app.profile_id` inside every transaction, which
-- is fragile under transaction pooling and adds a round trip to each query. That
-- is a genuine architecture change, not a migration, and pretending otherwise
-- would ship policies that look protective and enforce nothing.
--
-- NO FORCE. `FORCE ROW LEVEL SECURITY` would subject the owner to policies too.
-- With no policies defined that is a total lockout of the application the moment
-- the connection role loses BYPASSRLS. Enabling without FORCE keeps the failure
-- mode "still works" rather than "everything 500s".

DO $$
DECLARE
  target record;
  changed int := 0;
BEGIN
  FOR target IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'watchtower'
      AND c.relkind = 'r'          -- ordinary tables only
      AND c.relrowsecurity = false -- skip anything already enabled
  LOOP
    EXECUTE format('ALTER TABLE watchtower.%I ENABLE ROW LEVEL SECURITY', target.relname);
    changed := changed + 1;
  END LOOP;

  RAISE NOTICE 'Row level security enabled on % table(s) in schema watchtower', changed;
END
$$;

-- Belt and braces on the two roles Supabase exposes to the outside world. RLS
-- already denies them, but a future permissive policy written for one table
-- should not accidentally hand them the whole schema, and an explicit REVOKE
-- documents the intent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA watchtower FROM anon';
    EXECUTE 'REVOKE ALL ON SCHEMA watchtower FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA watchtower FROM authenticated';
    EXECUTE 'REVOKE ALL ON SCHEMA watchtower FROM authenticated';
  END IF;
END
$$;
