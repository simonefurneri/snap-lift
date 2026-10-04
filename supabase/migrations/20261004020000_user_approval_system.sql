-- ============================================================================
-- SnapLift Migration: User Approval System & Admin Control
-- ============================================================================

-- 1. Extend profiles table with email, is_approved, is_admin, approved_at
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. Backfill existing profiles: copy email from auth.users & approve existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

UPDATE public.profiles
SET is_approved = true, approved_at = COALESCE(approved_at, timezone('utc'::text, now()))
WHERE is_approved = false;

-- 3. Security Definer Helper Functions
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_approved = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true AND is_approved = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Trigger to protect is_approved, is_admin, approved_at from client-side modification
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow service_role / superuser to modify admin/approval flags.
    -- Block regular client users (role = authenticated or anon).
    IF (auth.jwt() ->> 'role') = 'authenticated' OR auth.role() = 'authenticated' THEN
        IF (NEW.is_approved IS DISTINCT FROM OLD.is_approved) OR
           (NEW.is_admin IS DISTINCT FROM OLD.is_admin) OR
           (NEW.approved_at IS DISTINCT FROM OLD.approved_at) THEN
            RAISE EXCEPTION 'Non hai i permessi per modificare i campi di amministrazione o approvazione.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_admin_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_admin_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();

-- Revoke column-level UPDATE on admin fields for client roles as defense-in-depth
REVOKE UPDATE (is_approved, is_admin, approved_at) ON public.profiles FROM authenticated, anon;

-- 5. Updated handle_new_user() trigger for auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        display_name, 
        weight_unit, 
        progression_pct, 
        load_step, 
        is_approved, 
        is_admin, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'kg',
        2.5,
        1.25,
        false,
        false,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update Row Level Security (RLS) Policies on all tables

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
CREATE POLICY "Users and admins can view profiles"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Plans Policies (Require is_approved)
DROP POLICY IF EXISTS "Users can view own plans" ON public.plans;
CREATE POLICY "Users can view own plans"
    ON public.plans FOR SELECT
    USING (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can insert own plans" ON public.plans;
CREATE POLICY "Users can insert own plans"
    ON public.plans FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can update own plans" ON public.plans;
CREATE POLICY "Users can update own plans"
    ON public.plans FOR UPDATE
    USING (auth.uid() = user_id AND public.is_approved())
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can delete own plans" ON public.plans;
CREATE POLICY "Users can delete own plans"
    ON public.plans FOR DELETE
    USING (auth.uid() = user_id AND public.is_approved());

-- Plan Days Policies (Require is_approved)
DROP POLICY IF EXISTS "Users can view own plan days" ON public.plan_days;
CREATE POLICY "Users can view own plan days"
    ON public.plan_days FOR SELECT
    USING (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can insert own plan days" ON public.plan_days;
CREATE POLICY "Users can insert own plan days"
    ON public.plan_days FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can update own plan days" ON public.plan_days;
CREATE POLICY "Users can update own plan days"
    ON public.plan_days FOR UPDATE
    USING (auth.uid() = user_id AND public.is_approved())
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can delete own plan days" ON public.plan_days;
CREATE POLICY "Users can delete own plan days"
    ON public.plan_days FOR DELETE
    USING (auth.uid() = user_id AND public.is_approved());

-- Exercises Policies (Require is_approved)
DROP POLICY IF EXISTS "Users can view own exercises" ON public.exercises;
CREATE POLICY "Users can view own exercises"
    ON public.exercises FOR SELECT
    USING (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can insert own exercises" ON public.exercises;
CREATE POLICY "Users can insert own exercises"
    ON public.exercises FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can update own exercises" ON public.exercises;
CREATE POLICY "Users can update own exercises"
    ON public.exercises FOR UPDATE
    USING (auth.uid() = user_id AND public.is_approved())
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can delete own exercises" ON public.exercises;
CREATE POLICY "Users can delete own exercises"
    ON public.exercises FOR DELETE
    USING (auth.uid() = user_id AND public.is_approved());

-- Workout Sessions Policies (Require is_approved)
DROP POLICY IF EXISTS "Users can view own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can view own workout sessions"
    ON public.workout_sessions FOR SELECT
    USING (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can insert own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can insert own workout sessions"
    ON public.workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can update own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can update own workout sessions"
    ON public.workout_sessions FOR UPDATE
    USING (auth.uid() = user_id AND public.is_approved())
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can delete own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can delete own workout sessions"
    ON public.workout_sessions FOR DELETE
    USING (auth.uid() = user_id AND public.is_approved());

-- Set Logs Policies (Require is_approved)
DROP POLICY IF EXISTS "Users can view own set logs" ON public.set_logs;
CREATE POLICY "Users can view own set logs"
    ON public.set_logs FOR SELECT
    USING (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can insert own set logs" ON public.set_logs;
CREATE POLICY "Users can insert own set logs"
    ON public.set_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can update own set logs" ON public.set_logs;
CREATE POLICY "Users can update own set logs"
    ON public.set_logs FOR UPDATE
    USING (auth.uid() = user_id AND public.is_approved())
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can delete own set logs" ON public.set_logs;
CREATE POLICY "Users can delete own set logs"
    ON public.set_logs FOR DELETE
    USING (auth.uid() = user_id AND public.is_approved());

-- Import Logs Policies (Require is_approved)
DROP POLICY IF EXISTS "Users can view own import logs" ON public.import_logs;
CREATE POLICY "Users can view own import logs"
    ON public.import_logs FOR SELECT
    USING (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can insert own import logs" ON public.import_logs;
CREATE POLICY "Users can insert own import logs"
    ON public.import_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());
