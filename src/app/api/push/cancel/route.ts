import { NextRequest, NextResponse } from 'next/server';
import { cancelTimerPush } from '@/lib/server/pushScheduler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timerId } = body;

    if (!timerId) {
      return NextResponse.json({ error: 'timerId mancante' }, { status: 400 });
    }

    const cancelled = cancelTimerPush(timerId);

    return NextResponse.json({ success: true, cancelled });
  } catch (err: any) {
    console.error('[api/push/cancel] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
