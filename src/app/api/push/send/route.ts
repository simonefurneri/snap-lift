import { NextRequest, NextResponse } from 'next/server';
import { sendWebPush } from '@/lib/server/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, payload } = body;

    if (!subscription || !payload) {
      return NextResponse.json(
        { error: 'Parametri mancanti (subscription, payload)' },
        { status: 400 }
      );
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
