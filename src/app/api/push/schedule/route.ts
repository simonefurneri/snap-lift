import { NextRequest, NextResponse, after } from 'next/server';
import {
  scheduleTimerPush,
  continueChainedSchedule,
  dispatchScheduledPush,
  isTimerCancelled,
  isScheduleActive,
  isScheduleValidShared,
} from '@/lib/server/pushScheduler';

export const maxDuration = 60; // Keep Vercel serverless function execution budget up to 60s

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const isLocal = host?.includes('localhost') || host?.includes('127.0.0.1');
  const proto = req.headers.get('x-forwarded-proto') || (isLocal ? 'http' : 'https');
  if (host) {
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || (isLocal ? 'http://localhost:3000' : 'https://localhost:3000');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subscription,
      delaySeconds,
      title,
      body: messageBody,
      timerId,
      exerciseName,
      scheduleId: incomingScheduleId,
      isChained,
    } = body;

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
      timerId,
      scheduleId: incomingScheduleId,
    };

    let scheduleId = incomingScheduleId;
    let delayMs = Math.max(500, Math.round(delaySeconds * 1000));

    if (isChained && incomingScheduleId) {
      const continuation = continueChainedSchedule(
        incomingScheduleId,
        timerId,
        delaySeconds,
        subscription,
        payload
      );
      if (!continuation.valid) {
        return NextResponse.json({ skipped: true, reason: 'cancelled_or_superseded' });
      }
      delayMs = continuation.delayMs;
    } else {
      const res = scheduleTimerPush(timerId, delaySeconds, subscription, payload);
      scheduleId = res.scheduleId;
      delayMs = res.delayMs;
      payload.scheduleId = scheduleId;
    }

    // Keep Next.js / Vercel execution context active.
    // In local dev and Node runtime, direct setTimeout in scheduleTimerPush guarantees execution.
    // In Vercel serverless, after() keeps the container alive.
    const CHUNK_LIMIT_SECONDS = 50;

    after(async () => {
      try {
        if (delaySeconds <= CHUNK_LIMIT_SECONDS || process.env.NODE_ENV !== 'production') {
          // Direct wait and dispatch within the current serverless budget or local dev
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          await dispatchScheduledPush(scheduleId);
        } else {
          // Timer exceeds single invocation budget in production: wait 50s then chain the remaining duration
          await new Promise((resolve) => setTimeout(resolve, CHUNK_LIMIT_SECONDS * 1000));

          // Check if cancelled or superseded during the 50s wait
          const isValidShared = await isScheduleValidShared(timerId, scheduleId);
          if (!isValidShared || isTimerCancelled(timerId) || !isScheduleActive(scheduleId)) {
            return;
          }

          const remainingSeconds = delaySeconds - CHUNK_LIMIT_SECONDS;
          const baseUrl = getBaseUrl(req);

          // Invoke next chunk to continue countdown seamlessly
          await fetch(`${baseUrl}/api/push/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription,
              delaySeconds: remainingSeconds,
              title,
              body: messageBody,
              timerId,
              exerciseName,
              scheduleId,
              isChained: true,
            }),
          });
        }
      } catch (err: any) {
        console.error('[after/push] Error in push scheduler execution:', err);
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
