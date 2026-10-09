-- ============================================================================
-- SnapLift Migration: Body Weight Tracking & Reminder Preferences
-- ============================================================================

-- 1. Extend profiles with weight reminder settings
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS weight_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS weight_reminder_time TEXT NOT NULL DEFAULT '08:00',
    ADD COLUMN IF NOT EXISTS weight_reminder_day INTEGER NOT NULL DEFAULT 1; -- 1 = Lunedì, -1 = Ogni giorno, 0 = Domenica

-- 2. Create body_weight_logs table
CREATE TABLE IF NOT EXISTS public.body_weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weight NUMERIC(5, 2) NOT NULL CHECK (weight > 0),
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_recorded_date UNIQUE (user_id, recorded_at)
);

-- 3. Indexes for fast range queries
CREATE INDEX IF NOT EXISTS idx_body_weight_logs_user_date 
    ON public.body_weight_logs(user_id, recorded_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.body_weight_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Requiring user approval like existing tables)
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
