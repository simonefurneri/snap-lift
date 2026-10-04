import 'server-only';
import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    // 1. Verify user session strictly from server-side cookies (no request params trusted)
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Utente non autenticato o sessione scaduta.' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Check if Service Role Key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Configurazione server incompleta (SUPABASE_SERVICE_ROLE_KEY mancante).' },
        { status: 500 }
      );
    }

    // 3. Admin-scoped atomic deletion: delete user from Supabase auth.users.
    // All dependent tables (profiles, plans, plan_days, exercises, workout_sessions, set_logs, import_logs)
    // are automatically and atomically purged via PostgreSQL foreign keys with ON DELETE CASCADE.
    const adminClient = createAdminClient();
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting Supabase auth user:', deleteAuthError);
      return NextResponse.json(
        { error: deleteAuthError.message || "Errore durante l'eliminazione dell'account da Supabase Auth." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account e tutti i dati correlati eliminati definitivamente.',
    });
  } catch (err: any) {
    console.error('Error in /api/user/delete-account:', err);
    return NextResponse.json(
      { error: err.message || "Errore durante l'eliminazione dell'account." },
      { status: 500 }
    );
  }
}


