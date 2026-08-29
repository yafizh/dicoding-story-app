import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';

function injectPrecacheManifest({ swSource, swOutput }) {
  let emittedAssets = [];
  let apiBaseUrl = '';

  return {
    name: 'inject-precache-manifest',
    apply: 'build',

    configResolved(resolvedConfig) {
      apiBaseUrl = resolvedConfig.env?.VITE_BASE_URL || '';
    },

    writeBundle(_options, bundle) {
      emittedAssets = Object.keys(bundle)
        .filter((fileName) => /\.(js|css|woff2?)$/i.test(fileName))
        .map((fileName) => `/${fileName}`);
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
        `self.__API_BASE_URL__ = ${JSON.stringify(apiBaseUrl)};\n` +
        `self.__BUILD_ASSETS__ = ${JSON.stringify(emittedAssets, null, 2)};\n\n`;

      writeFileSync(swOutput, banner + source, 'utf-8');

      this.info?.(`Precache manifest disuntikkan (${emittedAssets.length} berkas).`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
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
      swOutput: resolve(__dirname, 'dist', 'sw.js'),
    }),
  ],
});
