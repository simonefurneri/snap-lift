import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/supabase/adminAuth';
import { registerAdminSubscription } from '@/lib/server/pushScheduler';

export async function POST(req: NextRequest) {
  const { errorResponse, user } = await verifyAdminSession();
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json({ error: 'Utente non autorizzato' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Sottoscrizione non valida' }, { status: 400 });
    }

    await registerAdminSubscription(user.id, subscription);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/admin/push/subscribe] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore nella registrazione della sottoscrizione admin' },
      { status: 500 }
    );
  }
}
