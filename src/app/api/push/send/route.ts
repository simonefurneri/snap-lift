import { NextRequest, NextResponse } from 'next/server';
import { sendWebPush } from '@/lib/server/webPush';
import { isTimerCancelled } from '@/lib/server/pushScheduler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, payload, timerId } = body;

    if (!subscription || !payload) {
      return NextResponse.json(
        { error: 'Parametri mancanti (subscription, payload)' },
        { status: 400 }
      );
    }

    if (timerId && isTimerCancelled(timerId)) {
      return NextResponse.json({ skipped: true, reason: 'cancelled' });
    }

    await sendWebPush(subscription, payload);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/push/send] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante l\'invio della notifica' },
      { status: 500 }
    );
  }
}
