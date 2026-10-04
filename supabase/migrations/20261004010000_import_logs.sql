-- ============================================================================
-- SnapLift Migration: AI Plan Import Rate Limiting Logs
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
