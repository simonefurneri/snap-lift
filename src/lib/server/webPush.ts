import webPush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@snaplift.app';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error('[webPush] Error configuring VAPID details:', err);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendWebPush(
  subscription: webPush.PushSubscription,
  payload: PushNotificationPayload
) {
  return webPush.sendNotification(
    subscription,
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/workout',
      tag: payload.tag || 'rest-timer',
    }),
    {
      TTL: 60, // Expire after 60s if device cannot be reached
      urgency: 'high',
    }
  );
}
