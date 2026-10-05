import { NextRequest, NextResponse } from 'next/server';
import { sendWebPush } from '@/lib/server/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json({ error: 'subscription mancante' }, { status: 400 });
    }

    await sendWebPush(subscription, {
      title: 'SnapLift Test Notifica 🔔',
      body: 'Le notifiche push del timer sono configurate correttamente!',
      url: '/workout',
      tag: 'test-notification',
    });

    return NextResponse.json({ success: true, message: 'Notifica inviata con successo' });
  } catch (err: any) {
    console.error('[api/push/test] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante l\'invio della notifica' },
      { status: 500 }
    );
  }
}
