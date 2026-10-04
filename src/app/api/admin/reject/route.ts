import 'server-only';
import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/supabase/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const { errorResponse, user: currentAdmin, adminClient } = await verifyAdminSession();
  if (errorResponse) {
    return errorResponse;
  }
  if (!adminClient || !currentAdmin) {
    return NextResponse.json(
      { error: 'Client di amministrazione non disponibile.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const userId = body?.userId;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'ID utente non valido o mancante.' },
        { status: 400 }
      );
    }

    // Guard: Prevent admin from deleting their own account via admin rejection
    if (userId === currentAdmin.id) {
      return NextResponse.json(
        { error: 'Non puoi eliminare il tuo stesso account dal pannello di rifiuto.' },
        { status: 400 }
      );
    }

    // Admin-scoped atomic deletion: delete user from Supabase auth.users.
    // All dependent tables (profiles, plans, plan_days, exercises, workout_sessions, set_logs, import_logs)
    // are automatically and atomically purged via PostgreSQL foreign keys with ON DELETE CASCADE.
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error rejecting/deleting Supabase auth user:', deleteAuthError);
      return NextResponse.json(
        { error: deleteAuthError.message || 'Errore durante l\'eliminazione dell\'account da Supabase Auth.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account utente rifiutato ed eliminato con successo.',
    });
  } catch (err: any) {
    console.error('Error in /api/admin/reject:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante l\'eliminazione dell\'account.' },
      { status: 500 }
    );
  }
}
