import { NextRequest, NextResponse } from 'next/server';
import { sendWebPush } from '@/lib/server/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json({ error: 'subscription mancante' }, { status: 400 });
    }

    // Wait 4 seconds to give user time to lock their screen or switch to another app
    await new Promise((resolve) => setTimeout(resolve, 4000));

    await sendWebPush(subscription, {
      title: 'SnapLift Test Notifica 🔔',
      body: 'Se vedi questa notifica, il sistema Web Push per schermo bloccato è attivo!',
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
