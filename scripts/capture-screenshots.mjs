import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'src', 'public', 'screenshots');
const BASE_URL = process.env.BASE_URL;
const API_BASE_URL = process.env.VITE_BASE_URL;
const AUTH_KEY = 'STORY_APP_AUTH';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const TARGETS = [
  {
    name: 'desktop-home.png',
    hash: '#/',
    viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  },
  {
    name: 'desktop-add-story.png',
    hash: '#/add-story',
    viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  },
  {
    name: 'mobile-home.png',
    hash: '#/',
    viewport: { width: 540, height: 960, deviceScaleFactor: 1, isMobile: true },
  },
  {
    name: 'mobile-add-story.png',
    hash: '#/add-story',
    viewport: { width: 540, height: 960, deviceScaleFactor: 1, isMobile: true },
  },
];

function resolveChromePath() {
  const found = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      'Biner Chrome tidak ditemukan. Setel variabel lingkungan CHROME_PATH terlebih dahulu.'
    );
  }
  return found;
}

async function loginForSession() {
  const email = process.env.STORY_APP_EMAIL;
  const password = process.env.STORY_APP_PASSWORD;
  if (!email || !password) return null;

  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const json = await response.json();
  if (!response.ok) {
    console.warn(`Login gagal (${json.message}); screenshot diambil tanpa sesi login.`);
    return null;
  }

  console.log('Login berhasil, daftar cerita akan ikut tampil pada screenshot.');
  return json.loginResult;
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const session = await loginForSession();
  const browser = await puppeteer.launch({
    executablePath: resolveChromePath(),
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  try {
    for (const target of TARGETS) {
      const page = await browser.newPage();
      await page.setViewport(target.viewport);

      if (session) {
        await page.evaluateOnNewDocument(
          (key, value) => window.localStorage.setItem(key, value),
          AUTH_KEY,
          JSON.stringify(session)
        );
      }

      await page.goto(`${BASE_URL}/${target.hash}`, { waitUntil: 'networkidle2' });

      // Beri jeda agar tile peta, gambar, dan animasi selesai dirender.
      await wait(4000);

      const outputPath = resolve(OUTPUT_DIR, target.name);
      await page.screenshot({ path: outputPath, type: 'png' });
      console.log(`Tersimpan: ${outputPath}`);

      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
