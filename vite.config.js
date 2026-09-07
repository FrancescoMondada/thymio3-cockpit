import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));

// The Thymio 3 API is NOT vendored into this repo. It is a git submodule
// (lib/thymio3-ts-api) and we alias its TypeScript entry point directly, so
// every build compiles the current upstream source. To take upstream changes:
//   npm run api:update && npm run build
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      'thymio-api': resolve(here, 'lib/thymio3-ts-api/src/thymio.ts'),
    },
  },
});
