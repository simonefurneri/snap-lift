import 'server-only';
import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { User } from '@supabase/supabase-js';

export interface AdminAuthResult {
  errorResponse: NextResponse | null;
  user: User | null;
  adminClient: ReturnType<typeof createAdminClient> | null;
}

/**
 * Strictly verifies on the server that:
 * 1. The user has a valid authenticated session (via server cookies, getUser())
 * 2. The user has is_admin = true AND is_approved = true in the public.profiles database table (verified via service role)
 *
 * The admin role is NEVER read or trusted from client parameters/cookies.
 */
export async function verifyAdminSession(): Promise<AdminAuthResult> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Sessione non valida o scaduta. Effettua il login.' },
          { status: 401 }
        ),
        user: null,
        adminClient: null,
      };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Configurazione server incompleta (SUPABASE_SERVICE_ROLE_KEY mancante).' },
          { status: 500 }
        ),
        user: null,
        adminClient: null,
      };
    }

    const adminClient = createAdminClient();

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('is_admin, is_approved')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin || !profile.is_approved) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Accesso negato. Privilegi di amministratore richiesti.' },
          { status: 403 }
        ),
        user: null,
        adminClient: null,
      };
    }

    return {
      errorResponse: null,
      user,
      adminClient,
    };
  } catch (err: any) {
    console.error('Error verifying admin session:', err);
    return {
      errorResponse: NextResponse.json(
        { error: 'Errore interno durante la verifica dei privilegi di amministratore.' },
        { status: 500 }
      ),
      user: null,
      adminClient: null,
    };
  }
}
