import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { app, db } from '@/lib/firebase'
import { toast } from '@/stores/toastStore'

export type PushSetupResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'unsupported' | 'denied' | 'missing-vapid' | 'token-failed'; message: string }

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function enablePushNotifications(uid: string): Promise<PushSetupResult> {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported', message: 'This device does not support web push notifications.' }
  }

  if (!(await isSupported())) {
    return { ok: false, reason: 'unsupported', message: 'Firebase messaging is not supported on this browser.' }
  }

  const vapidKey = import.meta.env.VITE_FB_VAPID_KEY
  if (!vapidKey) {
    return { ok: false, reason: 'missing-vapid', message: 'Missing Firebase web push key.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied', message: 'Notifications are blocked. Enable them in iOS Settings to receive reminders.' }
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    })
    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })

    if (!token) {
      return { ok: false, reason: 'token-failed', message: 'Could not create a push token for this device.' }
    }

    await setDoc(
      doc(db, 'users', uid, 'notification_tokens', token),
      {
        token,
        permission: 'granted',
        user_agent: navigator.userAgent,
        updated_at: serverTimestamp(),
        created_at: serverTimestamp(),
      },
      { merge: true },
    )

    return { ok: true, token }
  } catch (error) {
    console.error('[Notifications] Failed to enable push:', error)
    return { ok: false, reason: 'token-failed', message: error instanceof Error ? error.message : 'Could not enable notifications.' }
  }
}

export async function listenForForegroundNotifications() {
  if (!(await isSupported())) return undefined
  const messaging = getMessaging(app)
  return onMessage(messaging, (payload) => {
    toast.info(payload.notification?.body ?? payload.notification?.title ?? 'DietQuest reminder')
  })
}
