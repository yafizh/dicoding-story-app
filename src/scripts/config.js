const BASE_PATH = import.meta.env.BASE_URL;

const CONFIG = {
  BASE_URL: import.meta.env.VITE_BASE_URL,
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  BASE_PATH,
  SERVICE_WORKER_PATH: `${BASE_PATH}sw.js`,
  publicUrl: (path = '') => `${BASE_PATH}${String(path).replace(/^\/+/, '')}`,
};

export default CONFIG;
