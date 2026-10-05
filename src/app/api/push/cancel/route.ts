import { NextRequest, NextResponse } from 'next/server';
import { cancelTimerPush } from '@/lib/server/pushScheduler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timerId, endpoint } = body;

    let cancelled = false;
    if (timerId) {
      cancelled = cancelTimerPush(timerId) || cancelled;
    }
    if (endpoint) {
      cancelled = cancelTimerPush(endpoint) || cancelled;
    }

    return NextResponse.json({ success: true, cancelled });
  } catch (err: any) {
    console.error('[api/push/cancel] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
