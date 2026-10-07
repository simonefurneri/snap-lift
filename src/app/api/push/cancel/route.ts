import { NextRequest, NextResponse } from 'next/server';
import { cancelTimerPush } from '@/lib/server/pushScheduler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timerId, endpoint } = body;

    if (!timerId && !endpoint) {
      return NextResponse.json({ error: 'timerId o endpoint mancante' }, { status: 400 });
    }

    const cancelled = await cancelTimerPush(timerId, endpoint);

    return NextResponse.json({ success: true, cancelled });
  } catch (err: any) {
    console.error('[api/push/cancel] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
