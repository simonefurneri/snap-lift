import { NextRequest, NextResponse } from 'next/server';
import { sendWebPush } from '@/lib/server/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json({ error: 'subscription mancante' }, { status: 400 });
    }

    // Short 2s delay so the user can see notification arrive
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await sendWebPush(subscription, {
      title: 'Promemoria Peso Corporeo ⚖️',
      body: 'Buongiorno! Ricordati di registrare il tuo peso odierno su SnapLift per mantenere aggiornato il tuo trend.',
      url: '/progress?tab=weight',
      tag: 'weight-reminder',
    });

    return NextResponse.json({ success: true, message: 'Notifica inviata con successo' });
  } catch (err: unknown) {
    console.error('[api/push/weight-reminder/test] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore durante l'invio della notifica di promemoria" },
      { status: 500 }
    );
  }
}
