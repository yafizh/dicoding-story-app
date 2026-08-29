const CONFIG = {
  BASE_URL: import.meta.env.VITE_BASE_URL,
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  SERVICE_WORKER_PATH: '/sw.js',
};

export default CONFIG;
