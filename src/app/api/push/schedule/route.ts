import { NextRequest, NextResponse, after } from 'next/server';
import { scheduleTimerPush, dispatchScheduledPush } from '@/lib/server/pushScheduler';

export const maxDuration = 60; // Keep Vercel serverless function execution budget up to 60s

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, delaySeconds, title, body: messageBody, timerId, exerciseName } = body;

    if (!subscription || typeof delaySeconds !== 'number' || !timerId) {
      return NextResponse.json(
        { error: 'Parametri mancanti (subscription, delaySeconds, timerId)' },
        { status: 400 }
      );
    }

    const payload = {
      title: title || 'Recupero Terminato! ⏰',
      body:
        messageBody ||
        (exerciseName
          ? `È ora della prossima serie per ${exerciseName}!`
          : 'Il tempo di recupero è finito, ricomincia la serie!'),
      url: '/workout',
      tag: 'rest-timer',
    };

    const { scheduleId, delayMs } = scheduleTimerPush(timerId, delaySeconds, subscription, payload);

    // For Vercel Serverless: use Next.js native after() to prevent Vercel from freezing the container.
    // dispatchScheduledPush is 100% idempotent: exactly ONE notification will ever be sent!
    after(async () => {
      if (delaySeconds <= 58) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        try {
          await dispatchScheduledPush(scheduleId);
        } catch (err: any) {
          console.error('[after/push] Error dispatching scheduled push:', err);
        }
      }
    });

    return NextResponse.json({ success: true, scheduleId, delayMs });
  } catch (err: any) {
    console.error('[api/push/schedule] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
