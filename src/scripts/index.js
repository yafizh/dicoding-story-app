// CSS imports
import 'leaflet/dist/leaflet.css';
import '../styles/styles.css';

import App from './pages/app';
import { registerServiceWorker } from './utils/sw-register';
import { initInstallPrompt } from './utils/install-prompt';
import { initNetworkStatus } from './utils/network-status';
import { initOutboxSync } from './utils/sync-manager';

document.addEventListener('DOMContentLoaded', async () => {
  await registerServiceWorker();

  initInstallPrompt();
  initNetworkStatus();
  initOutboxSync();

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data.url) {
        const targetHash = new URL(event.data.url, location.origin).hash || '#/';
        location.hash = targetHash;
      }
    });
  }
});
