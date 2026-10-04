import 'server-only';
import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/supabase/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const { errorResponse, adminClient } = await verifyAdminSession();
  if (errorResponse) {
    return errorResponse;
  }
  if (!adminClient) {
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

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error approving user:', updateError);
      return NextResponse.json(
        { error: 'Impossibile approvare l\'utente nel database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Utente approvato con successo.',
    });
  } catch (err: any) {
    console.error('Error in /api/admin/approve:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante l\'approvazione dell\'utente.' },
      { status: 500 }
    );
  }
}
