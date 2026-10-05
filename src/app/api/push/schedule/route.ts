import { NextRequest, NextResponse, after } from 'next/server';
import { scheduleTimerPush, isTimerCancelled } from '@/lib/server/pushScheduler';
import { sendWebPush } from '@/lib/server/webPush';

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

    const result = scheduleTimerPush(timerId, delaySeconds, subscription, payload);

    // For Vercel Serverless: use Next.js native after() to prevent Vercel from freezing the container!
    // For timers <= 58s (like 15s test, 30s preset, etc.), this delivers the push directly with ZERO external services!
    after(async () => {
      const delayMs = Math.max(500, Math.round(delaySeconds * 1000));
      if (delaySeconds <= 58) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (!isTimerCancelled(timerId)) {
          try {
            await sendWebPush(subscription, payload);
          } catch (err: any) {
            console.error('[after/push] Error sending scheduled push:', err);
          }
        }
      }
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[api/push/schedule] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
