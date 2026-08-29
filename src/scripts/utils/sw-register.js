import CONFIG from '../config';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker tidak didukung oleh browser ini.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(CONFIG.SERVICE_WORKER_PATH, {
      scope: '/',
    });
    console.log('Service worker berhasil didaftarkan.', registration.scope);
    return registration;
  } catch (error) {
    console.error('Gagal mendaftarkan service worker:', error);
    return null;
  }
}

export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.ready;
}
