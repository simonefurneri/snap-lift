-- ============================================================================
-- SnapLift Full Database Schema
-- Run this in your Supabase SQL Editor if you are setting up manually.
-- ============================================================================

-- 1. Profiles Table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
    progression_pct NUMERIC NOT NULL DEFAULT 2.5 CHECK (progression_pct > 0),
    load_step NUMERIC NOT NULL DEFAULT 1.25 CHECK (load_step > 0),
    is_approved BOOLEAN NOT NULL DEFAULT false,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    approved_at TIMESTAMPTZ,
    weight_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    weight_reminder_time TEXT NOT NULL DEFAULT '08:00',
    weight_reminder_day INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notes TEXT,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Plan Days Table
CREATE TABLE IF NOT EXISTS public.plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Exercises Table
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_day_id UUID NOT NULL REFERENCES public.plan_days(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    sets INTEGER NOT NULL DEFAULT 3 CHECK (sets > 0),
    reps_min INTEGER NOT NULL DEFAULT 8 CHECK (reps_min >= 0),
    reps_max INTEGER NOT NULL DEFAULT 12 CHECK (reps_max >= reps_min),
    rest_seconds INTEGER NOT NULL DEFAULT 90 CHECK (rest_seconds >= 0),
    technique_notes TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Workout Sessions Table
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_day_id UUID REFERENCES public.plan_days(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    finished_at TIMESTAMPTZ
);

-- 6. Set Logs Table
CREATE TABLE IF NOT EXISTS public.set_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    exercise_name TEXT NOT NULL,
    set_number INTEGER NOT NULL CHECK (set_number > 0),
    weight NUMERIC NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Import Logs Table (AI Rate Limiting)
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON public.plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_user_id ON public.plan_days(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_plan_day_id ON public.exercises(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_session_id ON public.set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_user_id ON public.set_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_user_date ON public.import_logs(user_id, created_at);

-- ============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================
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

-- ============================================================================
-- PROFILE ADMIN COLUMNS PROTECTION TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
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

REVOKE UPDATE (is_approved, is_admin, approved_at) ON public.profiles FROM authenticated, anon;

-- ============================================================================
-- AUTH TRIGGER FOR AUTOMATIC PROFILE CREATION
-- ============================================================================
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

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

-- Body Weight Logs Table
CREATE TABLE IF NOT EXISTS public.body_weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weight NUMERIC(5, 2) NOT NULL CHECK (weight > 0),
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_recorded_date UNIQUE (user_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_body_weight_logs_user_date 
    ON public.body_weight_logs(user_id, recorded_at DESC);

ALTER TABLE public.body_weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own body weight logs" ON public.body_weight_logs;
CREATE POLICY "Users can view own body weight logs"
    ON public.body_weight_logs FOR SELECT
    USING (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can insert own body weight logs" ON public.body_weight_logs;
CREATE POLICY "Users can insert own body weight logs"
    ON public.body_weight_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can update own body weight logs" ON public.body_weight_logs;
CREATE POLICY "Users can update own body weight logs"
    ON public.body_weight_logs FOR UPDATE
    USING (auth.uid() = user_id AND public.is_approved())
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

DROP POLICY IF EXISTS "Users can delete own body weight logs" ON public.body_weight_logs;
CREATE POLICY "Users can delete own body weight logs"
    ON public.body_weight_logs FOR DELETE
    USING (auth.uid() = user_id AND public.is_approved());

