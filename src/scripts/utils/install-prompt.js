import { showToast } from './toast';

const INSTALL_BUTTON_SELECTOR = '.install-button';

let deferredPrompt = null;
let isInstallable = false;
let useIosFallback = false;

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  );
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function setVisibility(button, isVisible) {
  const wrapper = button.closest('li');

  button.hidden = !isVisible;
  if (wrapper) wrapper.hidden = !isVisible;
}

export function syncInstallButtons() {
  const isVisible = isInstallable || useIosFallback;

  document
    .querySelectorAll(INSTALL_BUTTON_SELECTOR)
    .forEach((button) => setVisibility(button, isVisible));
}

function setButtonsBusy(isBusy) {
  document.querySelectorAll(INSTALL_BUTTON_SELECTOR).forEach((button) => {
    button.disabled = isBusy;
  });
}

async function handleInstallClick() {
  if (!deferredPrompt) {
    if (useIosFallback) {
      showToast(
        'Untuk memasang: ketuk tombol Bagikan di Safari, lalu pilih "Tambahkan ke Layar Utama".',
        'info',
        7000
      );
      return;
    }

    showToast(
      'Aplikasi sudah terpasang, atau browser Anda belum menyediakan opsi instalasi saat ini.',
      'info'
    );
    return;
  }

  setButtonsBusy(true);

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      showToast('Story App sedang dipasang di perangkat Anda.', 'success');
      isInstallable = false;
      syncInstallButtons();
    } else {
      showToast('Instalasi dibatalkan. Anda dapat memasangnya kapan saja.', 'info');
    }
  } catch (error) {
    console.error('Gagal menampilkan prompt instalasi:', error);
  } finally {
    deferredPrompt = null;
    setButtonsBusy(false);
  }
}

export function initInstallPrompt() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest(INSTALL_BUTTON_SELECTOR);
    if (button) handleInstallClick();
  });

  if (isStandaloneMode()) {
    syncInstallButtons();
    return;
  }

  if (isIosSafari()) {
    useIosFallback = true;
    syncInstallButtons();
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    isInstallable = true;
    syncInstallButtons();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    isInstallable = false;
    syncInstallButtons();
    showToast('Story App berhasil dipasang di perangkat Anda.', 'success');
  });

  syncInstallButtons();
}
