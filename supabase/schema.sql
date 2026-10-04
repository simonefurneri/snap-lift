-- ============================================================================
-- SnapLift Full Database Schema
-- Run this in your Supabase SQL Editor if you are setting up manually.
-- ============================================================================

-- 1. Profiles Table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
    progression_pct NUMERIC NOT NULL DEFAULT 2.5 CHECK (progression_pct > 0),
    load_step NUMERIC NOT NULL DEFAULT 1.25 CHECK (load_step > 0),
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

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON public.plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_user_id ON public.plan_days(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_plan_day_id ON public.exercises(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_session_id ON public.set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_user_id ON public.set_logs(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Plans Policies
CREATE POLICY "Users can view own plans"
    ON public.plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
    ON public.plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
    ON public.plans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
    ON public.plans FOR DELETE
    USING (auth.uid() = user_id);

-- Plan Days Policies
CREATE POLICY "Users can view own plan days"
    ON public.plan_days FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan days"
    ON public.plan_days FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan days"
    ON public.plan_days FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan days"
    ON public.plan_days FOR DELETE
    USING (auth.uid() = user_id);

-- Exercises Policies
CREATE POLICY "Users can view own exercises"
    ON public.exercises FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises"
    ON public.exercises FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
    ON public.exercises FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
    ON public.exercises FOR DELETE
    USING (auth.uid() = user_id);

-- Workout Sessions Policies
CREATE POLICY "Users can view own workout sessions"
    ON public.workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sessions"
    ON public.workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sessions"
    ON public.workout_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sessions"
    ON public.workout_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Set Logs Policies
CREATE POLICY "Users can view own set logs"
    ON public.set_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own set logs"
    ON public.set_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own set logs"
    ON public.set_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own set logs"
    ON public.set_logs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- AUTH TRIGGER FOR AUTOMATIC PROFILE CREATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, weight_unit, progression_pct, load_step)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'kg',
        2.5,
        1.25
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. Import Logs Table (AI Rate Limiting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_import_logs_user_date ON public.import_logs(user_id, created_at);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import logs"
    ON public.import_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import logs"
    ON public.import_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
