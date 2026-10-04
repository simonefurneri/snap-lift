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

    // Guard: Prevent admin from revoking their own access
    if (userId === currentAdmin.id) {
      return NextResponse.json(
        { error: 'Non puoi revocare la tua stessa approvazione.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        is_approved: false,
        approved_at: null,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error revoking user:', updateError);
      return NextResponse.json(
        { error: 'Impossibile revocare l\'approvazione dell\'utente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Approvazione utente revocata con successo.',
    });
  } catch (err: any) {
    console.error('Error in /api/admin/revoke:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante la revoca dell\'utente.' },
      { status: 500 }
    );
  }
}
