import CONFIG from '../config';
import { subscribePushNotification, unsubscribePushNotification } from '../data/api';
import { getAuthToken } from './auth';
import { getServiceWorkerRegistration } from './sw-register';

export function convertBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function isNotificationAvailable() {
  return 'Notification' in window;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && isNotificationAvailable();
}

export function isNotificationGranted() {
  return isNotificationAvailable() && Notification.permission === 'granted';
}

export function isNotificationDenied() {
  return isNotificationAvailable() && Notification.permission === 'denied';
}

export async function requestNotificationPermission() {
  if (!isNotificationAvailable()) {
    console.warn('Notification API tidak didukung browser ini.');
    return false;
  }

  if (isNotificationGranted()) return true;

  const status = await Notification.requestPermission();

  if (status === 'denied') {
    console.warn('Izin notifikasi ditolak pengguna.');
    return false;
  }

  if (status === 'default') {
    console.warn('Permintaan izin notifikasi ditutup pengguna.');
    return false;
  }

  return true;
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null;

  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;

  return registration.pushManager.getSubscription();
}

export async function isCurrentPushSubscriptionAvailable() {
  return Boolean(await getPushSubscription());
}

function generateSubscribeOptions() {
  return {
    userVisibleOnly: true,
    applicationServerKey: convertBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY),
  };
}

export async function subscribePush() {
  if (!isPushSupported()) {
    return { ok: false, message: 'Browser Anda tidak mendukung push notification.' };
  }

  const token = getAuthToken();
  if (!token) {
    return { ok: false, message: 'Anda harus masuk terlebih dahulu untuk mengaktifkan notifikasi.' };
  }

  if (await isCurrentPushSubscriptionAvailable()) {
    return { ok: true, message: 'Langganan push notification sudah aktif.' };
  }

  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) {
    return {
      ok: false,
      message: 'Izin notifikasi belum diberikan. Aktifkan izin notifikasi pada pengaturan browser.',
    };
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return { ok: false, message: 'Service worker belum siap. Muat ulang halaman lalu coba lagi.' };
  }

  let pushSubscription = null;

  try {
    pushSubscription = await registration.pushManager.subscribe(generateSubscribeOptions());

    const { endpoint, keys } = pushSubscription.toJSON();
    await subscribePushNotification({ endpoint, keys }, token);

    return { ok: true, message: 'Push notification berhasil diaktifkan.' };
  } catch (error) {
    console.error('Gagal berlangganan push notification:', error);

    if (pushSubscription) {
      await pushSubscription.unsubscribe().catch(() => {});
    }

    return {
      ok: false,
      message: error.message || 'Gagal mengaktifkan push notification. Silakan coba lagi.',
    };
  }
}

export async function unsubscribePush() {
  const token = getAuthToken();
  const pushSubscription = await getPushSubscription();

  if (!pushSubscription) {
    return { ok: true, message: 'Anda memang belum berlangganan push notification.' };
  }

  const { endpoint } = pushSubscription.toJSON();

  try {
    if (token) {
      await unsubscribePushNotification({ endpoint }, token);
    }

    const unsubscribed = await pushSubscription.unsubscribe();
    if (!unsubscribed) {
      throw new Error('Browser gagal menghapus langganan push notification.');
    }

    return { ok: true, message: 'Push notification berhasil dinonaktifkan.' };
  } catch (error) {
    console.error('Gagal berhenti berlangganan push notification:', error);
    return {
      ok: false,
      message: error.message || 'Gagal menonaktifkan push notification. Silakan coba lagi.',
    };
  }
}

export async function sendStoryContextToServiceWorker(story) {
  if (!('serviceWorker' in navigator) || !story) return;

  try {
    const registration = await getServiceWorkerRegistration();
    const target = registration?.active || navigator.serviceWorker.controller;
    if (!target) return;

    target.postMessage({
      type: 'STORY_CONTEXT',
      payload: {
        id: story.id,
        name: story.name,
        description: story.description,
        photoUrl: story.photoUrl,
      },
    });
  } catch (error) {
    console.error('Gagal mengirim konteks cerita ke service worker:', error);
  }
}
