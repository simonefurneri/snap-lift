import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminsOfRegistration } from '@/lib/server/pushScheduler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayName, email } = body;

    const sentCount = await notifyAdminsOfRegistration(displayName || 'Nuovo utente', email);

    return NextResponse.json({ success: true, sentCount });
  } catch (err: any) {
    console.error('[api/auth/notify-registration] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore nella notifica agli admin' },
      { status: 500 }
    );
  }
}
