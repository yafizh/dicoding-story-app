import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';

function normalizeBasePath(rawBasePath) {
  const trimmed = (rawBasePath || '').trim();
  if (!trimmed || trimmed === '/') return '/';

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function injectPrecacheManifest({ swSource }) {
  let emittedAssets = [];
  let apiBaseUrl = '';
  let basePath = '/';
  let swOutput = '';

  return {
    name: 'inject-precache-manifest',
    apply: 'build',

    configResolved(resolvedConfig) {
      apiBaseUrl = resolvedConfig.env?.VITE_BASE_URL || '';
      basePath = resolvedConfig.base;
      swOutput = resolve(resolvedConfig.build.outDir, 'sw.js');
    },

    writeBundle(_options, bundle) {
      emittedAssets = Object.keys(bundle)
        .filter((fileName) => /\.(js|css|woff2?)$/i.test(fileName))
        .map((fileName) => `${basePath}${fileName}`);
    },

    closeBundle() {
      if (!existsSync(swOutput)) {
        // Jaga-jaga bila penyalinan folder public belum sempat berjalan.
        if (!existsSync(swSource)) return;
        copyFileSync(swSource, swOutput);
      }

      const source = readFileSync(swOutput, 'utf-8');
      const banner =
        `// Dibuat otomatis saat build — jangan diubah manual.\n` +
        `self.__BUILD_MODE__ = 'production';\n` +
        `self.__BASE_PATH__ = ${JSON.stringify(basePath)};\n` +
        `self.__API_BASE_URL__ = ${JSON.stringify(apiBaseUrl)};\n` +
        `self.__BUILD_ASSETS__ = ${JSON.stringify(emittedAssets, null, 2)};\n\n`;

      writeFileSync(swOutput, banner + source, 'utf-8');

      this.info?.(`Precache manifest disuntikkan (${emittedAssets.length} berkas).`);
    },
  };
}

function injectManifestBasePath({ manifestSource }) {
  let basePath = '/';
  let manifestOutput = '';

  const render = () => readFileSync(manifestSource, 'utf-8').replaceAll('%BASE%', basePath);

  return {
    name: 'inject-manifest-base-path',

    configResolved(resolvedConfig) {
      basePath = resolvedConfig.base;
      manifestOutput = resolve(resolvedConfig.build.outDir, 'manifest.webmanifest');
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        if (!pathname.endsWith('/manifest.webmanifest')) return next();

        res.setHeader('Content-Type', 'application/manifest+json');
        res.end(render());
      });
    },

    closeBundle() {
      if (!existsSync(manifestSource)) return;
      writeFileSync(manifestOutput, render(), 'utf-8');
      this.info?.(`Base path "${basePath}" disuntikkan ke manifest.webmanifest.`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const base = normalizeBasePath(env.VITE_APP_BASE_PATH);

  return {
    base,
    root: resolve(__dirname, 'src'),
    publicDir: resolve(__dirname, 'src', 'public'),
    envDir: resolve(__dirname),
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    plugins: [
      injectPrecacheManifest({
        swSource: resolve(__dirname, 'src', 'public', 'sw.js'),
      }),
      injectManifestBasePath({
        manifestSource: resolve(__dirname, 'src', 'public', 'manifest.webmanifest'),
      }),
    ],
  };
});
